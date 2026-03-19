// Swiss & European postal code lookup using Nominatim (OpenStreetMap)

export interface PostalCodeResult {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

const COUNTRY_CODES: Record<string, string> = {
  Switzerland: "ch",
  Suisse: "ch",
  Schweiz: "ch",
  Svizzera: "ch",
  France: "fr",
  Germany: "de",
  Deutschland: "de",
  Allemagne: "de",
  Italy: "it",
  Italia: "it",
  Italie: "it",
  Austria: "at",
  Österreich: "at",
  Autriche: "at",
};

// Map language codes to Accept-Language header values
const LANGUAGE_ACCEPT_HEADERS: Record<string, string> = {
  en: "en-US,en;q=0.9",
  fr: "fr-FR,fr;q=0.9",
  de: "de-DE,de;q=0.9",
  it: "it-IT,it;q=0.9",
};

// Map country names to language-specific versions
const COUNTRY_NAME_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Switzerland
  "Schweiz/Suisse/Svizzera/Svizra": { en: "Switzerland", fr: "Suisse", de: "Schweiz", it: "Svizzera" },
  "Switzerland": { en: "Switzerland", fr: "Suisse", de: "Schweiz", it: "Svizzera" },
  "Suisse": { en: "Switzerland", fr: "Suisse", de: "Schweiz", it: "Svizzera" },
  "Schweiz": { en: "Switzerland", fr: "Suisse", de: "Schweiz", it: "Svizzera" },
  "Svizzera": { en: "Switzerland", fr: "Suisse", de: "Schweiz", it: "Svizzera" },
  // France
  "France": { en: "France", fr: "France", de: "Frankreich", it: "Francia" },
  "Frankreich": { en: "France", fr: "France", de: "Frankreich", it: "Francia" },
  // Germany
  "Germany": { en: "Germany", fr: "Allemagne", de: "Deutschland", it: "Germania" },
  "Deutschland": { en: "Germany", fr: "Allemagne", de: "Deutschland", it: "Germania" },
  "Allemagne": { en: "Germany", fr: "Allemagne", de: "Deutschland", it: "Germania" },
  // Italy
  "Italy": { en: "Italy", fr: "Italie", de: "Italien", it: "Italia" },
  "Italia": { en: "Italy", fr: "Italie", de: "Italien", it: "Italia" },
  "Italien": { en: "Italy", fr: "Italie", de: "Italien", it: "Italia" },
  // Austria
  "Austria": { en: "Austria", fr: "Autriche", de: "Österreich", it: "Austria" },
  "Österreich": { en: "Austria", fr: "Autriche", de: "Österreich", it: "Austria" },
  "Autriche": { en: "Austria", fr: "Autriche", de: "Österreich", it: "Austria" },
};

/**
 * Translate a country name to the target language
 */
function translateCountryName(country: string, language: string): string {
  const translations = COUNTRY_NAME_TRANSLATIONS[country];
  if (translations && translations[language]) {
    return translations[language];
  }
  // If no translation found, return as-is
  return country;
}

/**
 * Look up city/state/country from a postal code using Nominatim.
 * @param language - The language code (en, fr, de, it) for localized results
 */
export async function lookupPostalCode(
  postalCode: string,
  countryHint?: string,
  language: string = "en"
): Promise<PostalCodeResult | null> {
  if (!postalCode || postalCode.trim().length < 3) return null;

  const cc = countryHint ? COUNTRY_CODES[countryHint] : undefined;
  const params = new URLSearchParams({
    format: "json",
    postalcode: postalCode.trim(),
    limit: "1",
    "accept-language": language,
  });
  if (cc) params.set("countrycodes", cc);

  try {
    const acceptLang = LANGUAGE_ACCEPT_HEADERS[language] || "en-US,en;q=0.9";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": acceptLang,
        },
      }
    );
    const data = await res.json();
    if (!data.length) return null;

    const addr = data[0].address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || "";
    const state = addr.state || addr.county || "";
    const rawCountry = addr.country || countryHint || "";
    
    // Translate country name to match selected language
    const country = translateCountryName(rawCountry, language);

    return {
      city,
      state,
      country,
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Look up location from a city name using Nominatim.
 * @param language - The language code (en, fr, de, it) for localized results
 */
export async function lookupCity(
  cityName: string,
  countryHint?: string,
  language: string = "en"
): Promise<PostalCodeResult | null> {
  if (!cityName || cityName.trim().length < 2) return null;

  const cc = countryHint ? COUNTRY_CODES[countryHint] : undefined;
  const q = cc ? `${cityName.trim()}, ${countryHint}` : cityName.trim();
  const params = new URLSearchParams({
    format: "json",
    q,
    limit: "1",
    addressdetails: "1",
    "accept-language": language,
  });
  if (cc) params.set("countrycodes", cc);

  try {
    const acceptLang = LANGUAGE_ACCEPT_HEADERS[language] || "en-US,en;q=0.9";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "Accept-Language": acceptLang,
        },
      }
    );
    const data = await res.json();
    if (!data.length) return null;

    const addr = data[0].address || {};
    const rawCountry = addr.country || countryHint || "";
    
    return {
      city: addr.city || addr.town || addr.village || addr.municipality || cityName,
      state: addr.state || addr.county || "",
      country: translateCountryName(rawCountry, language),
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Validate that a postal code / city / country combination is consistent.
 */
export async function validateLocationConsistency(
  postalCode: string,
  city: string,
  country: string
): Promise<{ valid: boolean; suggestedCity?: string; suggestedCountry?: string; suggestedState?: string }> {
  const result = await lookupPostalCode(postalCode, country);
  if (!result) return { valid: false };

  const normalise = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cityMatch = normalise(result.city) === normalise(city);
  const countryMatch = normalise(result.country) === normalise(country);

  if (cityMatch && countryMatch) return { valid: true };

  return {
    valid: false,
    suggestedCity: result.city,
    suggestedCountry: result.country,
    suggestedState: result.state,
  };
}

/**
 * Haversine distance between two points in km.
 */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
