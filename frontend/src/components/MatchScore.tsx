import { useMemo } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { calculateMatchScore, MatchInput } from "@/utils/matchScore";

interface Props {
  nannyProfile: any;
  familyLanguages?: string[];
  familyLat?: number | null;
  familyLng?: number | null;
  distanceKm?: number | null;
  availabilitySlots?: { day: string; period: string }[];
}

const BREAKDOWN_LABELS: Record<string, string> = {
  distance: "Distance",
  languages: "Languages",
  experience: "Experience",
  schedule: "Schedule",
  services: "Services",
};

const MatchScore = ({
  nannyProfile,
  familyLanguages,
  familyLat,
  familyLng,
  distanceKm,
  availabilitySlots = [],
}: Props) => {
  const result = useMemo(() => {
    const nannyServices: string[] = [];
    if (nannyProfile.offers_date_night) nannyServices.push("date_night");
    if (nannyProfile.offers_overnight) nannyServices.push("overnight");
    if (nannyProfile.offers_after_school) nannyServices.push("after_school");
    if (nannyProfile.offers_weekend_holiday) nannyServices.push("weekend_holiday");
    if (nannyProfile.offers_full_time) nannyServices.push("full_time");
    if (nannyProfile.offers_part_time) nannyServices.push("part_time");

    const days = [...new Set(availabilitySlots.map(s => s.day))];
    const periods = [...new Set(availabilitySlots.map(s => s.period))];

    const input: MatchInput = {
      familyLat,
      familyLng,
      familyLanguages,
      nannyLat: nannyProfile.latitude ? Number(nannyProfile.latitude) : null,
      nannyLng: nannyProfile.longitude ? Number(nannyProfile.longitude) : null,
      nannyLanguages: nannyProfile.languages || [],
      nannyYearsExperience: nannyProfile.years_of_experience || 0,
      nannyServices,
      nannyAvailableDays: days,
      nannyAvailablePeriods: periods,
      distanceKm,
    };

    return calculateMatchScore(input);
  }, [nannyProfile, familyLanguages, familyLat, familyLng, distanceKm, availabilitySlots]);

  const scoreColor =
    result.score >= 80 ? "text-emerald-600" : result.score >= 60 ? "text-amber-600" : "text-destructive";

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Match Score</h3>
        <span className={`text-2xl font-bold ${scoreColor}`}>{result.score}</span>
      </div>

      <Progress value={result.score} className="h-2 mb-4" />

      {/* Breakdown bars */}
      <div className="space-y-1.5 mb-4">
        {Object.entries(result.breakdown).map(([key, value]) => {
          const max = key === "distance" || key === "languages" ? 25 : key === "experience" ? 20 : 15;
          const pct = Math.round((value / max) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-16">{BREAKDOWN_LABELS[key]}</span>
              <Progress value={pct} className="flex-1 h-1.5" />
              <span className="text-[11px] text-muted-foreground w-6 text-right">{value}</span>
            </div>
          );
        })}
      </div>

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">Good match because</p>
          <ul className="space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MatchScore;
