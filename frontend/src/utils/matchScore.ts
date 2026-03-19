/**
 * Deterministic Match Score — 0-100, no AI calls.
 *
 * Weights:
 *   Distance       25 pts
 *   Languages      25 pts
 *   Experience     20 pts
 *   Schedule       15 pts
 *   Services       15 pts
 */

export interface MatchInput {
  // Family side
  familyLat?: number | null;
  familyLng?: number | null;
  familyLanguages?: string[];
  familyNeededServices?: string[]; // e.g. ["full_time","overnight"]

  // Nanny side
  nannyLat?: number | null;
  nannyLng?: number | null;
  nannyLanguages?: string[];
  nannyYearsExperience?: number;
  nannyServices?: string[];
  nannyAvailableDays?: string[];   // e.g. ["Monday","Saturday"]
  nannyAvailablePeriods?: string[]; // e.g. ["Morning","Evening"]
  distanceKm?: number | null;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  breakdown: {
    distance: number;
    languages: number;
    experience: number;
    schedule: number;
    services: number;
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateMatchScore(input: MatchInput): MatchResult {
  const reasons: string[] = [];

  // --- Distance (25 pts) ---
  let distScore = 0;
  let distKm = input.distanceKm;
  if (distKm == null && input.familyLat && input.familyLng && input.nannyLat && input.nannyLng) {
    distKm = haversineKm(input.familyLat, input.familyLng, input.nannyLat, input.nannyLng);
  }
  if (distKm != null) {
    if (distKm <= 3) { distScore = 25; reasons.push(`${Math.round(distKm)} km from your location`); }
    else if (distKm <= 5) { distScore = 22; reasons.push(`${Math.round(distKm)} km from your location`); }
    else if (distKm <= 10) { distScore = 18; reasons.push(`${Math.round(distKm)} km from your location`); }
    else if (distKm <= 20) { distScore = 12; reasons.push(`${Math.round(distKm)} km away`); }
    else if (distKm <= 50) { distScore = 6; reasons.push(`${Math.round(distKm)} km away`); }
    else { distScore = 2; }
  } else {
    distScore = 10; // unknown — neutral
  }

  // --- Languages (25 pts) ---
  let langScore = 0;
  const fLangs = (input.familyLanguages || []).map(l => l.toLowerCase());
  const nLangs = (input.nannyLanguages || []).map(l => l.toLowerCase());
  if (fLangs.length > 0 && nLangs.length > 0) {
    const shared = fLangs.filter(l => nLangs.includes(l));
    if (shared.length >= 3) { langScore = 25; }
    else if (shared.length === 2) { langScore = 22; }
    else if (shared.length === 1) { langScore = 18; }
    else { langScore = 5; }
    if (shared.length > 0) {
      const labels = shared.map(l => l.charAt(0).toUpperCase() + l.slice(1));
      reasons.push(`Speaks ${labels.join(" and ")}`);
    }
  } else if (nLangs.length >= 3) {
    langScore = 20;
    reasons.push("Multilingual nanny");
  } else if (nLangs.length > 0) {
    langScore = 15;
  }

  // --- Experience (20 pts) ---
  let expScore = 0;
  const yrs = input.nannyYearsExperience || 0;
  if (yrs >= 10) { expScore = 20; reasons.push(`${yrs}+ years childcare experience`); }
  else if (yrs >= 7) { expScore = 17; reasons.push(`${yrs} years experience`); }
  else if (yrs >= 4) { expScore = 14; reasons.push(`${yrs} years experience`); }
  else if (yrs >= 2) { expScore = 10; reasons.push(`${yrs} years experience`); }
  else if (yrs >= 1) { expScore = 6; }
  else { expScore = 3; }

  // --- Schedule (15 pts) ---
  let schedScore = 0;
  const days = input.nannyAvailableDays || [];
  const periods = input.nannyAvailablePeriods || [];
  if (days.length >= 5 && periods.length >= 2) { schedScore = 15; }
  else if (days.length >= 3 && periods.length >= 1) { schedScore = 12; }
  else if (days.length >= 1) { schedScore = 8; }
  else { schedScore = 5; }
  if (periods.length > 0) {
    reasons.push(`Available ${periods.map(p => p.toLowerCase()).join(" and ")}`);
  }

  // --- Services (15 pts) ---
  let svcScore = 0;
  const nSvc = input.nannyServices || [];
  const fSvc = input.familyNeededServices || [];
  if (fSvc.length > 0 && nSvc.length > 0) {
    const matched = fSvc.filter(s => nSvc.includes(s));
    const ratio = matched.length / fSvc.length;
    svcScore = Math.round(ratio * 15);
    if (matched.length > 0) {
      const labels = matched.map(s => s.replace(/_/g, " "));
      reasons.push(`Offers ${labels.join(", ")} care`);
    }
  } else if (nSvc.length >= 3) {
    svcScore = 13;
  } else if (nSvc.length > 0) {
    svcScore = 10;
  } else {
    svcScore = 5;
  }

  const score = Math.min(100, distScore + langScore + expScore + schedScore + svcScore);

  return {
    score,
    reasons,
    breakdown: {
      distance: distScore,
      languages: langScore,
      experience: expScore,
      schedule: schedScore,
      services: svcScore,
    },
  };
}
