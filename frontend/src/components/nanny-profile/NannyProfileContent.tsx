import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Baby, BookOpen, Car, ChefHat, Home, Heart,
  GraduationCap, Check, Video, Mic, Pencil,
  Star, MapPin, FileText, Quote,
} from "lucide-react";
import NannyProfileLocationMap from "./NannyProfileLocationMap";
import ScrollReveal from "./ScrollReveal";
import DynamicProfileDescription from "./DynamicProfileDescription";
import SwissEmploymentDisclaimer from "@/components/SwissEmploymentDisclaimer";
import NannyReferences from "@/components/NannyReferences";
import TrustBadges, { buildBadges } from "@/components/TrustBadges";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  profile: any;
  nannyProfile: any;
  photos: any[];
  nannyUserId: string;
  onMessage: () => void;
  isOwner?: boolean;
  availabilitySlots?: { day: string; period: string }[];
}

const EditBtn = ({ tab }: { tab: string }) => (
  <Link to={`/edit-profile?tab=${tab}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto">
    <Pencil className="h-3 w-3" /> Edit
  </Link>
);

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border border-border p-4 ${className}`}>{children}</div>
);

const SectionTitle = ({ icon: Icon, children, tab, isOwner }: { icon?: any; children: React.ReactNode; tab?: string; isOwner?: boolean }) => (
  <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
    {Icon && <Icon className="h-4 w-4 text-primary" />}
    {children}
    {isOwner && tab && <EditBtn tab={tab} />}
  </h2>
);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const PERIODS = ["Morning", "Afternoon", "Evening", "Night"] as const;

const NannyProfileContent = ({ profile, nannyProfile, photos, nannyUserId, isOwner, availabilitySlots = [] }: Props) => {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selfRefs, setSelfRefs] = useState<any[]>([]);
  const [signedLetterUrls, setSignedLetterUrls] = useState<Record<string, string>>({});
  const [approvedCerts, setApprovedCerts] = useState<{ certificate_type: string }[]>([]);

  useEffect(() => {
    const loadCerts = async () => {
      const { data } = await supabase
        .from("user_certificates" as any)
        .select("certificate_type")
        .eq("user_id", nannyUserId)
        .eq("status", "approved");
      setApprovedCerts((data as any[]) || []);
    };
    loadCerts();
  }, [nannyUserId]);

  useEffect(() => {
    const loadSelfRefs = async () => {
      const { data } = await supabase
        .from("nanny_self_references")
        .select("*")
        .eq("user_id", nannyUserId)
        .order("created_at", { ascending: false });
      const refs = data || [];
      setSelfRefs(refs);

      // Generate signed URLs for reference letters (private bucket)
      const urlMap: Record<string, string> = {};
      await Promise.all(
        refs
          .filter((r) => r.reference_letter_url)
          .map(async (r) => {
            const path = r.reference_letter_url.split("nanny-documents/")[1];
            if (!path) return;
            const { data: signed } = await supabase.storage
              .from("nanny-documents")
              .createSignedUrl(path, 3600);
            if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
          })
      );
      setSignedLetterUrls(urlMap);
    };
    loadSelfRefs();
  }, [nannyUserId]);

  const certifications = [
    nannyProfile.has_first_aid && "First Aid",
    nannyProfile.has_cpr && "CPR",
    nannyProfile.has_early_childhood_cert && "Early Childhood",
    nannyProfile.has_child_psychology && "Child Psychology",
    nannyProfile.has_nutrition_cert && "Nutrition",
    nannyProfile.has_montessori_cert && "Montessori",
    ...(nannyProfile.other_certifications || []),
  ].filter(Boolean);

  const services = [
    nannyProfile.offers_date_night && "Date-Night",
    nannyProfile.offers_overnight && "Overnight",
    nannyProfile.offers_after_school && "After-School",
    nannyProfile.offers_weekend_holiday && "Weekend & Holiday",
    nannyProfile.offers_full_time && "Full-Time",
    nannyProfile.offers_part_time && "Part-Time",
  ].filter(Boolean);

  const skills = [
    nannyProfile.can_cook && { label: "Cooking", icon: ChefHat },
    nannyProfile.can_drive && { label: "Can Drive", icon: Car },
    nannyProfile.has_car && { label: "Own Car", icon: Car },
    nannyProfile.can_help_homework && { label: "Homework Help", icon: BookOpen },
    nannyProfile.can_do_light_housekeeping && { label: "Housekeeping", icon: Home },
  ].filter(Boolean) as { label: string; icon: any }[];

  const ageGroups = [
    nannyProfile.experience_infants && "Infants (0-1)",
    nannyProfile.experience_toddlers && "Toddlers (1-3)",
    nannyProfile.experience_preschool && "Preschool (3-5)",
    nannyProfile.experience_school_age && "School Age (5-12)",
    nannyProfile.experience_teenagers && "Teenagers (12+)",
  ].filter(Boolean);

  const practicalDetails = [
    { label: "Driver's license", value: nannyProfile.has_drivers_license },
    { label: "Own car", value: nannyProfile.has_car },
    { label: "Cooking", value: nannyProfile.can_cook },
    { label: "Housekeeping", value: nannyProfile.can_do_light_housekeeping },
    { label: "Comfortable with pets", value: nannyProfile.comfortable_with_pets },
  ];
  const hasPracticals = practicalDetails.some(d => d.value);

  // Availability summary
  const slotSet = new Set(availabilitySlots.map(s => `${s.day}-${s.period}`));
  const hasSlots = availabilitySlots.length > 0;
  const availablePeriods = PERIODS.filter(p => DAYS.some(d => slotSet.has(`${d}-${p}`)));

  // Bio: use manual bio if set, otherwise show full dynamic description
  const bioText = nannyProfile.bio || "";
  const hasBio = !!bioText;
  const bioIsTruncated = hasBio && bioText.length > 200 && !bioExpanded;
  const shownBio = bioIsTruncated ? bioText.slice(0, 200).replace(/\s\S*$/, "…") : bioText;

  return (
    <div className="space-y-4">

      {/* Trust Badges */}
      <ScrollReveal>
        <SectionCard>
          <SectionTitle icon={Heart}>Trust & Verification</SectionTitle>
          <TrustBadges
            badges={buildBadges({
              emailVerified: true,
              phoneVerified: true,
              identityVerified: true,
              approvedCertificates: approvedCerts,
            })}
            size="md"
          />
          {nannyProfile.availability_last_updated && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="availability-updated-date">
              Availability updated on: {new Date(nannyProfile.availability_last_updated).toLocaleDateString()}
            </p>
          )}
        </SectionCard>
      </ScrollReveal>

      {/* 1. Quick Availability */}
      <ScrollReveal>
        <SectionCard>
          <SectionTitle tab="availability" isOwner={isOwner}>Availability</SectionTitle>
          {hasSlots ? (
            <div className="space-y-2">
              {/* Summary line */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
                <span className="text-muted-foreground text-xs">Available:</span>
                {availablePeriods.map(p => (
                  <span key={p} className="text-xs font-medium">{p}</span>
                ))}
              </div>
              {nannyProfile.available_school_holidays && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="h-3 w-3" /> School holidays
                </span>
              )}
              {nannyProfile.work_radius_km && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Travel up to {nannyProfile.work_radius_km} km
                </span>
              )}

              {/* Full grid (collapsed by default on mobile) */}
              <details className="mt-1">
                <summary className="text-xs text-primary cursor-pointer hover:underline">View full schedule</summary>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr>
                        <th className="pb-1"></th>
                        {DAY_SHORT.map(d => (
                          <th key={d} className="pb-1 font-medium text-muted-foreground">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map(period => (
                        <tr key={period}>
                          <td className="pr-2 text-right text-muted-foreground py-0.5 whitespace-nowrap">{period}</td>
                          {DAYS.map(day => {
                            const active = slotSet.has(`${day}-${period}`);
                            return (
                              <td key={day} className="py-0.5">
                                <div className={`w-5 h-5 mx-auto rounded-full flex items-center justify-center text-[9px] ${
                                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                }`}>
                                  {active ? "✓" : "–"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No availability set yet.</p>
          )}
        </SectionCard>
      </ScrollReveal>

      {/* 2. Reviews & References — always shown */}
      <ScrollReveal>
        <NannyReferences nannyUserId={nannyUserId} />
      </ScrollReveal>

      {/* 2b. References (documents/testimonials from previous families) — always shown */}
      <ScrollReveal>
        <SectionCard>
          <SectionTitle icon={FileText} tab="references" isOwner={isOwner}>References</SectionTitle>
          {selfRefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No references yet.</p>
          ) : (
            <div className="space-y-3">
              {selfRefs.map((ref) => (
                <div key={ref.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{ref.family_name}</span>
                    {ref.relationship && (
                      <span className="text-xs text-muted-foreground">• {ref.relationship}</span>
                    )}
                    {ref.service_period && (
                      <span className="text-xs text-muted-foreground">• {ref.service_period}</span>
                    )}
                  </div>
                  {ref.testimonial && (
                    <p className="text-sm text-muted-foreground leading-relaxed italic">"{ref.testimonial}"</p>
                  )}
                  {ref.reference_letter_url && (signedLetterUrls[ref.id] ? (
                    <a
                      href={signedLetterUrls[ref.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <FileText className="h-3 w-3" /> View reference letter
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <FileText className="h-3 w-3" /> Loading document…
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </ScrollReveal>

      {/* 3. Experience with children */}
      {ageGroups.length > 0 && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle icon={Baby} tab="experience" isOwner={isOwner}>Experience with children</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {ageGroups.map(a => <Badge key={a} variant="outline" className="text-xs py-0.5 px-2">{a}</Badge>)}
            </div>
            {nannyProfile.experience_special_needs && nannyProfile.special_needs_details && (
              <div className="mt-2 p-2 bg-muted rounded-lg">
                <p className="text-xs text-foreground flex items-center gap-1 mb-0.5">
                  <Heart className="h-3 w-3 text-primary" /> Special needs experience
                </p>
                <p className="text-xs text-muted-foreground">{nannyProfile.special_needs_details}</p>
              </div>
            )}
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 4. About me */}
      {hasBio ? (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle tab="basic" isOwner={isOwner}>About me</SectionTitle>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{shownBio}</p>
            {bioText.length > 200 && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="text-xs text-primary hover:underline mt-1"
              >
                {bioExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </SectionCard>
        </ScrollReveal>
      ) : (
        <DynamicProfileDescription profile={profile} nannyProfile={nannyProfile} />
      )}

      {/* 5. Photo gallery */}
      {photos.length > 1 && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle tab="photos" isOwner={isOwner}>Photos</SectionTitle>
            <div className="grid grid-cols-4 gap-1.5">
              {photos.slice(0, 8).map((p: any) => (
                <div key={p.id} className="aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={p.photo_url} alt="Photo" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 6. Video & Voice Introductions */}
      {(nannyProfile.video_intro_url || nannyProfile.voice_intro_url) && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle
              icon={nannyProfile.video_intro_url ? Video : Mic}
              tab="media"
              isOwner={isOwner}
            >
              Meet {profile.full_name?.split(" ")[0] || "me"}
            </SectionTitle>
            {nannyProfile.video_intro_url && (
              <video src={nannyProfile.video_intro_url} controls className="w-full rounded-lg max-h-64 bg-foreground/5" preload="metadata" />
            )}
            {nannyProfile.voice_intro_url && (
              <div className="flex items-center gap-2 mt-2">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
                <audio src={nannyProfile.voice_intro_url} controls className="flex-1 h-8" preload="metadata" />
              </div>
            )}
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 7. Skills & Services (compact) */}
      {((nannyProfile.activities_offered || []).length > 0 || skills.length > 0 || services.length > 0) && (
        <ScrollReveal>
          <SectionCard>
            {(nannyProfile.activities_offered || []).length > 0 && (
              <div className="mb-3">
                <SectionTitle tab="basic" isOwner={isOwner}>Superpowers</SectionTitle>
                <p className="text-xs text-muted-foreground">{nannyProfile.activities_offered.join(" · ")}</p>
              </div>
            )}
            {services.length > 0 && (
              <div className="mb-3">
                <SectionTitle tab="services" isOwner={isOwner}>Services</SectionTitle>
                <p className="text-xs text-muted-foreground">{services.join(" · ")}</p>
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Also comfortable with</p>
                <p className="text-xs text-muted-foreground">{skills.map(s => s.label).join(" · ")}</p>
              </div>
            )}
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 8. Education & Certifications */}
      {(nannyProfile.education || certifications.length > 0) && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle icon={GraduationCap} tab="certifications" isOwner={isOwner}>Education & Certifications</SectionTitle>
            {nannyProfile.education && (
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Education</span>
                <span className="font-medium text-foreground text-right max-w-[65%]">{nannyProfile.education}</span>
              </div>
            )}
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {certifications.map(c => (
                  <Badge key={c} className="bg-primary/10 text-primary border-0 text-xs py-0.5 px-2">{c}</Badge>
                ))}
              </div>
            )}
          </SectionCard>
        </ScrollReveal>
      )}

      {/* Course Links */}
      {nannyProfile.course_links && (nannyProfile.course_links as any[]).length > 0 && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle tab="certifications" isOwner={isOwner}>Training & Courses</SectionTitle>
            <div className="space-y-1">
              {(nannyProfile.course_links as any[]).map((link: any, i: number) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <BookOpen className="h-3 w-3" /> {link.title || link.url}
                </a>
              ))}
            </div>
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 9. Practical Details */}
      {hasPracticals && (
        <ScrollReveal>
          <SectionCard>
            <SectionTitle tab="basic" isOwner={isOwner}>Practical Details</SectionTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {practicalDetails.filter(d => d.value).map(d => (
                <span key={d.label} className="flex items-center gap-1 text-foreground">
                  <Check className="h-3 w-3 text-emerald-500" /> {d.label}
                </span>
              ))}
            </div>
            {nannyProfile.smoking_status && nannyProfile.smoking_status !== "non_smoker" && (
              <p className="text-xs text-muted-foreground mt-1">
                Smoking: {nannyProfile.smoking_status === "outside_only" ? "Outside only" : "Yes"}
              </p>
            )}
          </SectionCard>
        </ScrollReveal>
      )}

      {/* 10. Map */}
      <ScrollReveal>
        <NannyProfileLocationMap
          latitude={nannyProfile.latitude}
          longitude={nannyProfile.longitude}
          postalCode={nannyProfile.postal_code}
          city={nannyProfile.city}
          country={nannyProfile.country}
          locationLabel={
            nannyProfile.city && nannyProfile.country
              ? `${nannyProfile.city}, ${nannyProfile.country}`
              : nannyProfile.city || nannyProfile.country || profile.location || null
          }
        />
      </ScrollReveal>

      {/* 11. Legal note */}
      <ScrollReveal>
        <SwissEmploymentDisclaimer />
      </ScrollReveal>
    </div>
  );
};

export default NannyProfileContent;
