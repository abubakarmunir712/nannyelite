import { useMemo } from "react";
import ScrollReveal from "./ScrollReveal";

interface Props {
  profile: any;
  nannyProfile: any;
}

/**
 * Generates a first-person, human-sounding profile description
 * entirely from structured data. Auto-updates when source fields change.
 */
const DynamicProfileDescription = ({ profile, nannyProfile }: Props) => {
  const description = useMemo(() => {
    const parts: string[] = [];

    // --- Intro ---
    const caregiverTypes = (nannyProfile.caregiver_types || []) as string[];
    const typeLabels: Record<string, string> = {
      babysitter: "babysitter",
      au_pair: "au pair",
      nanny_assistant: "nanny assistant",
      part_time_nanny: "part-time nanny",
      full_time_nanny: "full-time nanny",
    };
    const types = caregiverTypes.map(t => typeLabels[t] || t.replace(/_/g, " "));
    const location = nannyProfile.city && nannyProfile.country
      ? `${nannyProfile.city}, ${nannyProfile.country}`
      : nannyProfile.city || nannyProfile.country || profile.location || null;

    const firstName = profile.full_name?.split(" ")[0] || "";
    const intro = types.length > 0
      ? `Hi, I'm ${firstName || "a caregiver"}! I work as a ${types.join(" & ")}`
      : `Hi, I'm ${firstName || "a caregiver"}`;
    parts.push(location ? `${intro} in ${location}.` : `${intro}.`);

    // --- Experience ---
    if (nannyProfile.years_of_experience && nannyProfile.years_of_experience > 0) {
      const y = nannyProfile.years_of_experience;
      parts.push(y === 1 ? "I've been doing this for about a year." : `I've been doing this for ${y} years.`);
    }

    // --- Age groups ---
    const ages: string[] = [];
    if (nannyProfile.experience_infants) ages.push("infants");
    if (nannyProfile.experience_toddlers) ages.push("toddlers");
    if (nannyProfile.experience_preschool) ages.push("preschoolers");
    if (nannyProfile.experience_school_age) ages.push("school-age kids");
    if (nannyProfile.experience_teenagers) ages.push("teenagers");
    if (ages.length > 0) {
      parts.push(`I love working with ${ages.join(", ")}.`);
    }

    // --- Languages ---
    const languages = (profile.languages || []) as string[];
    if (languages.length === 1) {
      parts.push(`I speak ${languages[0]}.`);
    } else if (languages.length > 1) {
      const last = languages[languages.length - 1];
      const rest = languages.slice(0, -1).join(", ");
      parts.push(`I speak ${rest} and ${last}.`);
    }

    // --- Certifications ---
    const certs: string[] = [];
    if (nannyProfile.has_first_aid) certs.push("First Aid");
    if (nannyProfile.has_cpr) certs.push("CPR");
    if (nannyProfile.has_early_childhood_cert) certs.push("Early Childhood Education");
    if (nannyProfile.has_child_psychology) certs.push("Child Psychology");
    if (nannyProfile.has_nutrition_cert) certs.push("Nutrition");
    if (nannyProfile.has_montessori_cert) certs.push("Montessori");
    const otherCerts = (nannyProfile.other_certifications || []) as string[];
    certs.push(...otherCerts);
    if (certs.length > 0) {
      parts.push(`I'm trained in ${certs.join(", ")}.`);
    }

    // --- Education ---
    if (nannyProfile.education) {
      parts.push(`I studied ${nannyProfile.education}.`);
    }

    // --- Skills ---
    const skills: string[] = [];
    if (nannyProfile.can_cook) skills.push("cook meals for the kids");
    if (nannyProfile.can_help_homework) skills.push("help with homework");
    if (nannyProfile.can_do_light_housekeeping) skills.push("handle light housekeeping");
    if (nannyProfile.can_drive) skills.push("drive");
    if (skills.length > 0) {
      parts.push(`I can also ${skills.join(", ")}.`);
    }

    // --- Services ---
    const svc: string[] = [];
    if (nannyProfile.offers_date_night) svc.push("date nights");
    if (nannyProfile.offers_overnight) svc.push("overnights");
    if (nannyProfile.offers_after_school) svc.push("after-school pickups");
    if (nannyProfile.offers_weekend_holiday) svc.push("weekends & holidays");
    if (nannyProfile.offers_full_time) svc.push("full-time positions");
    if (nannyProfile.offers_part_time) svc.push("part-time arrangements");
    if (svc.length > 0) {
      parts.push(`I'm available for ${svc.join(", ")}.`);
    }

    // --- Special needs ---
    if (nannyProfile.experience_special_needs && nannyProfile.special_needs_details) {
      parts.push("I have experience caring for children with special needs.");
    }

    return parts.join(" ");
  }, [profile, nannyProfile]);

  if (!description) return null;

  return (
    <ScrollReveal>
      <section className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">About me</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </section>
    </ScrollReveal>
  );
};

export default DynamicProfileDescription;
