import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Check, Zap, MapPin, Pencil } from "lucide-react";
import BookingRequestForm from "@/components/BookingRequestForm";
import SwissEmploymentDisclaimer from "@/components/SwissEmploymentDisclaimer";

interface Props {
  profile: any;
  nannyProfile: any;
  nannyUserId: string;
  onMessage: () => void;
  isFavorite: boolean;
  favLoading: boolean;
  toggleFavorite: () => void;
  isOwner?: boolean;
  availabilitySlots?: { day: string; period: string }[];
}

const EditBtn = ({ tab }: { tab: string }) => (
  <Link to={`/edit-profile?tab=${tab}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto">
    <Pencil className="h-3 w-3" /> Edit
  </Link>
);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const PERIODS = ["Morning", "Afternoon", "Evening", "Night"] as const;

const NannyProfileSidebar = ({ profile, nannyProfile, nannyUserId, onMessage, isOwner, availabilitySlots = [] }: Props) => {
  const firstName = profile.full_name?.split(" ")[0] || "Nanny";

  const services = [
    nannyProfile.offers_date_night && "Date-Night",
    nannyProfile.offers_overnight && "Overnight",
    nannyProfile.offers_after_school && "After-School",
    nannyProfile.offers_weekend_holiday && "Weekend & Holiday",
    nannyProfile.offers_full_time && "Full-Time",
    nannyProfile.offers_part_time && "Part-Time",
  ].filter(Boolean) as string[];

  const allVerifications = [
    { label: "Government ID", verified: !!nannyProfile.id_verified },
    { label: "Background Check", verified: !!nannyProfile.background_check_passed },
    { label: "Police Certificate", verified: !!nannyProfile.police_certificate_passed },
    { label: "Phone", verified: !!nannyProfile.phone_verified },
    { label: "Email", verified: !!nannyProfile.email_verified },
  ];

  const aboutMe = [
    { label: "Driver's license", value: nannyProfile.has_drivers_license ? "Yes" : "No" },
    { label: "Car", value: nannyProfile.has_car ? "Yes" : "No" },
    { label: "Smoker", value: nannyProfile.smoking_status === "non_smoker" ? "No" : nannyProfile.smoking_status === "outside_only" ? "Outside only" : "Yes" },
    { label: "Comfortable with pets", value: nannyProfile.comfortable_with_pets ? "Yes" : "No" },
    ...(nannyProfile.education ? [{ label: "Education", value: nannyProfile.education }] : []),
  ];

  // Build a lookup set for quick slot checking
  const slotSet = new Set(availabilitySlots.map(s => `${s.day}-${s.period}`));

  // Check if any slots exist
  const hasSlots = availabilitySlots.length > 0;

  // Format the last updated date
  const lastUpdated = nannyProfile.updated_at
    ? new Date(nannyProfile.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="lg:sticky lg:top-4 space-y-4">
      {/* Contact + Message buttons */}
      <div className="hidden lg:block bg-card rounded-xl border border-border p-4 space-y-3">
        <BookingRequestForm
          nannyUserId={nannyUserId}
          nannyName={firstName}
          hourlyRateSpot={nannyProfile.hourly_rate_spot}
          hourlyRateRecurring={nannyProfile.hourly_rate_recurring}
          services={services}
        >
          <Button className="w-full rounded-full" size="lg">
            Contact {firstName}
          </Button>
        </BookingRequestForm>
        <Button variant="outline" className="w-full rounded-full gap-2" onClick={onMessage}>
          <MessageCircle className="h-4 w-4" /> Send Message
        </Button>
        <SwissEmploymentDisclaimer />
      </div>

      {/* Verifications */}
        <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" /> Verification
        </h3>
        <div className="space-y-2">
          {allVerifications.map(v => (
            <div key={v.label} className="flex items-center gap-2 text-sm">
              {v.verified ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground text-xs">✗</span>
              )}
              <span className={v.verified ? "text-foreground" : "text-muted-foreground"}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Availability grid – Morning / Afternoon / Evening */}
        <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          Availability {isOwner && <EditBtn tab="availability" />}
        </h3>
        {hasSlots ? (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="pb-2"></th>
                  {DAY_SHORT.map(d => (
                    <th key={d} className="pb-2 font-medium text-muted-foreground">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td className="pr-2 text-right text-muted-foreground py-1 whitespace-nowrap">{period}</td>
                    {DAYS.map((day, i) => {
                      const active = slotSet.has(`${day}-${period}`);
                      return (
                        <td key={day} className="py-1">
                          <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] ${
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
        ) : (
          <p className="text-sm text-muted-foreground">No availability set yet.</p>
        )}
        {nannyProfile.available_school_holidays && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="h-3.5 w-3.5" /> Available during school holidays
          </div>
        )}
        {nannyProfile.availability_notes && (
          <p className="text-xs text-muted-foreground mt-2 italic">{nannyProfile.availability_notes}</p>
        )}
        {nannyProfile.work_radius_km && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Willing to travel up to {nannyProfile.work_radius_km} km
          </div>
        )}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* About me */}
        <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">About me {isOwner && <EditBtn tab="basic" />}</h3>
        <div className="space-y-2.5">
          {aboutMe.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">{item.value}</span>
            </div>
          ))}
          {(profile.languages || []).length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Languages</span>
              <span className="font-medium text-foreground">{profile.languages.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
        <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">Pricing {isOwner && <EditBtn tab="services" />}</h3>
        <div className="space-y-2">
          {nannyProfile.babysitting_rate_chf && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Babysitting</span>
              <span className="font-semibold text-foreground">CHF {Number(nannyProfile.babysitting_rate_chf).toFixed(0)} / hour</span>
            </div>
          )}
          {nannyProfile.part_time_childcare_rate_chf && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Part-time childcare</span>
              <span className="font-semibold text-foreground">CHF {Number(nannyProfile.part_time_childcare_rate_chf).toFixed(0)} / hour</span>
            </div>
          )}
          {!nannyProfile.babysitting_rate_chf && !nannyProfile.part_time_childcare_rate_chf && nannyProfile.hourly_rate_spot && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Babysitting</span>
              <span className="font-semibold text-foreground">CHF {Number(nannyProfile.hourly_rate_spot).toFixed(0)} / hour</span>
            </div>
          )}
          {!nannyProfile.babysitting_rate_chf && !nannyProfile.part_time_childcare_rate_chf && nannyProfile.hourly_rate_recurring && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Part-time childcare</span>
              <span className="font-semibold text-foreground">CHF {Number(nannyProfile.hourly_rate_recurring).toFixed(0)} / hour</span>
            </div>
          )}
        </div>
      </div>

      {/* Responsiveness */}
      {(nannyProfile.response_rate != null || nannyProfile.avg_response_time_hours != null) && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" /> Responsiveness
          </h3>
          <div className="space-y-2">
            {nannyProfile.response_rate != null && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Response rate</span>
                <span className="font-semibold text-foreground">{Math.round(nannyProfile.response_rate)}%</span>
              </div>
            )}
            {nannyProfile.avg_response_time_hours != null && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Avg. response time</span>
                <span className="font-semibold text-foreground">
                  {nannyProfile.avg_response_time_hours < 1
                    ? "< 1 hour"
                    : `${Math.round(nannyProfile.avg_response_time_hours)} hour${Math.round(nannyProfile.avg_response_time_hours) !== 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NannyProfileSidebar;
