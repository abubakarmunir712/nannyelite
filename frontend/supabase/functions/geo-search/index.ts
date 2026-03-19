import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org";

interface GeoResult {
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lon: number;
  displayName: string;
}

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

function parseResult(item: any, language: string = "en"): GeoResult {
  const addr = item.address || {};
  const rawCountry = addr.country || "";
  return {
    city: addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || "",
    state: addr.state || addr.county || "",
    country: translateCountryName(rawCountry, language),
    postalCode: addr.postcode || "",
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    displayName: item.display_name || "",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, language = "en" } = body;
    
    // Build headers with language preference
    const acceptLang = LANGUAGE_ACCEPT_HEADERS[language] || "en-US,en;q=0.9";
    const HEADERS = { 
      "User-Agent": "NannyElite/1.0", 
      "Accept": "application/json",
      "Accept-Language": acceptLang,
    };

    if (action === "search") {
      const { query } = body;
      if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        format: "json",
        q: query.trim(),
        limit: "8",
        addressdetails: "1",
        countrycodes: "ch,de,fr,it,at",
        "accept-language": language,
      });

      const res = await fetch(`${NOMINATIM}/search?${params}`, { headers: HEADERS });
      const data = await res.json();
      const results: GeoResult[] = data.map((item: any) => parseResult(item, language));

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reverse") {
      const { lat, lon } = body;
      if (lat == null || lon == null) {
        return new Response(JSON.stringify({ error: "lat and lon required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        format: "json",
        lat: String(lat),
        lon: String(lon),
        addressdetails: "1",
        "accept-language": language,
      });

      const res = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: HEADERS });
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(parseResult(data, language)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'search' or 'reverse'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
