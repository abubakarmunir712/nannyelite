import { useMemo } from "react";
import { Check } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

interface Props {
  profile: any;
  nannyProfile: any;
  availabilitySlots: { day: string; period: string }[];
}

/**
 * Auto-generated "Quick Fit" summary from structured profile data.
 * Helps families instantly see if this nanny matches their needs.
 */
const QuickFitSummary = ({ profile, nannyProfile, availabilitySlots }: Props) => {
  const bullets = useMemo(() => {
    const items: string[] = [];

    // Languages
    const langs = profile.languages || [];
    if (langs.length >= 2) items.push("Multilingual nanny");
    else if (langs.length === 1) items.push(`Speaks ${langs[0]}`);

    // Experience
    const yrs = nannyProfile.years_of_experience || 0;
    if (yrs >= 10) items.push(`${yrs}+ years childcare experience`);
    else if (yrs >= 5) items.push(`${yrs} years childcare experience`);
    else if (yrs > 0) items.push(`${yrs} year${yrs > 1 ? "s" : ""} of experience`);

    // Availability periods
    const periods = [...new Set(availabilitySlots.map(s => s.period.toLowerCase()))];
    if (periods.length > 0) {
      items.push(`Available ${periods.join(" and ")}`);
    }

    // Practical skills
    const practicals: string[] = [];
    if (nannyProfile.comfortable_with_pets) practicals.push("pets");
    if (nannyProfile.can_cook) practicals.push("cooking");
    if (nannyProfile.can_drive) practicals.push("driving");
    if (nannyProfile.can_help_homework) practicals.push("homework help");
    if (practicals.length === 1) {
      items.push(`Comfortable with ${practicals[0]}`);
    } else if (practicals.length === 2) {
      items.push(`Comfortable with ${practicals[0]} and ${practicals[1]}`);
    } else if (practicals.length > 2) {
      const last = practicals.pop()!;
      items.push(`Comfortable with ${practicals.join(", ")}, and ${last}`);
    }

    // Service types
    const svc: string[] = [];
    if (nannyProfile.offers_part_time) svc.push("part-time");
    if (nannyProfile.offers_full_time) svc.push("full-time");
    if (nannyProfile.offers_overnight) svc.push("overnight");
    if (nannyProfile.offers_date_night) svc.push("date-night");
    if (nannyProfile.offers_after_school) svc.push("after-school");
    if (svc.length > 0) {
      items.push(`Available for ${svc.join(", ")} care`);
    }

    // Certifications
    const certs: string[] = [];
    if (nannyProfile.has_first_aid) certs.push("First Aid");
    if (nannyProfile.has_cpr) certs.push("CPR");
    if (nannyProfile.has_early_childhood_cert) certs.push("Early Childhood");
    if (certs.length > 0) {
      items.push(`Certified in ${certs.join(", ")}`);
    }

    // Special needs
    if (nannyProfile.experience_special_needs) {
      items.push("Experience with special needs children");
    }

    return items.slice(0, 6); // cap at 6 bullets
  }, [profile, nannyProfile, availabilitySlots]);

  if (bullets.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">Good fit if you are looking for</h2>
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </ScrollReveal>
  );
};

export default QuickFitSummary;
