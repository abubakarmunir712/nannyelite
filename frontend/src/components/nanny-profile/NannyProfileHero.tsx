import { MapPin, Star, Clock, Globe, Shield, Check, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FavoriteButton from "@/components/FavoriteButton";
import BookingRequestForm from "@/components/BookingRequestForm";

interface Props {
  profile: any;
  nannyProfile: any;
  mainPhoto: string;
  isFavorite: boolean;
  favLoading: boolean;
  toggleFavorite: () => void;
  distanceKm?: number | null;
  onMessage: () => void;
  nannyUserId: string;
  isOwner?: boolean;
}

const NannyProfileHero = ({
  profile, nannyProfile, mainPhoto, isFavorite, favLoading, toggleFavorite,
  distanceKm, onMessage, nannyUserId, isOwner,
}: Props) => {
  const city = nannyProfile.city;
  const country = nannyProfile.country;
  const locationLabel = city && country ? `${city}, ${country}` : city || country || profile.location || null;
  const firstName = profile.full_name?.split(" ")[0] || "Nanny";

  const caregiverTypes = (nannyProfile.caregiver_types || []).map(
    (t: string) => {
      const labels: Record<string, string> = {
        babysitter: "Babysitter", au_pair: "Au Pair", nanny_assistant: "Nanny Assistant",
        part_time_nanny: "Part-time Nanny", full_time_nanny: "Full-time Nanny",
      };
      return labels[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  );

  const services = [
    nannyProfile.offers_date_night && "Date-Night",
    nannyProfile.offers_overnight && "Overnight",
    nannyProfile.offers_after_school && "After-School",
    nannyProfile.offers_weekend_holiday && "Weekend & Holiday",
    nannyProfile.offers_full_time && "Full-Time",
    nannyProfile.offers_part_time && "Part-Time",
  ].filter(Boolean) as string[];

  const allRoles = [...caregiverTypes, ...services];

  const rate = nannyProfile.babysitting_rate_chf || nannyProfile.hourly_rate_spot;
  const languages = profile.languages || [];

  const verifications = [
    { label: "First Aid", ok: !!nannyProfile.has_first_aid },
    { label: "ID", ok: !!nannyProfile.id_verified },
    { label: "Phone", ok: !!nannyProfile.phone_verified },
    { label: "Email", ok: !!nannyProfile.email_verified },
    { label: "Background", ok: !!nannyProfile.background_check_passed },
    { label: "Police", ok: !!nannyProfile.police_certificate_passed },
  ];
  const verifiedItems = verifications.filter(v => v.ok);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-xl shadow-sm max-w-3xl mx-auto"
    >
      <div className="p-4 sm:p-5">
        {/* Row 1: Photo + Name/Location/Rate */}
        <div className="flex gap-4 sm:gap-5">
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-primary/15 shadow-md">
            <img src={mainPhoto} alt={profile.full_name || "Nanny"} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">{profile.full_name}</h1>
              {nannyProfile.id_verified && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground">
                  <Shield className="h-2.5 w-2.5" />
                </span>
              )}
              {nannyProfile.total_reviews > 0 && nannyProfile.avg_rating != null && (
                <span className="flex items-center gap-0.5 text-xs ml-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{Number(nannyProfile.avg_rating).toFixed(1)}</span>
                  <span className="text-muted-foreground">({nannyProfile.total_reviews})</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              {distanceKm != null && (
                <span className="text-primary font-medium">
                  {distanceKm < 1 ? "< 1 km" : `${Math.round(distanceKm)} km`} from you ·{" "}
                </span>
              )}
              {locationLabel && <span>{locationLabel}</span>}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-sm">
              {rate && <span className="font-bold text-foreground">CHF {Number(rate).toFixed(0)} / hr</span>}
              {nannyProfile.years_of_experience > 0 && (
                <span className="text-muted-foreground text-xs">
                  {nannyProfile.years_of_experience} year{nannyProfile.years_of_experience > 1 ? "s" : ""} experience
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Languages */}
        {languages.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Languages</p>
            <p className="text-xs text-foreground">{languages.join(" · ")}</p>
          </div>
        )}

        {/* Row 3: Available for */}
        {allRoles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Available for</p>
            <p className="text-xs text-foreground">{allRoles.join(" · ")}</p>
          </div>
        )}

        {/* Row 4: Verification */}
        {verifiedItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Verification</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {verifiedItems.map(v => (
                <span key={v.label} className="flex items-center gap-1 text-foreground">
                  <Check className="h-3 w-3 text-emerald-500" /> {v.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact button */}
      {!isOwner && (
        <div className="hidden sm:flex items-center gap-2 px-4 sm:px-5 pb-4 sm:pb-5">
          <BookingRequestForm
            nannyUserId={nannyUserId}
            nannyName={firstName}
            hourlyRateSpot={nannyProfile.hourly_rate_spot}
            hourlyRateRecurring={nannyProfile.hourly_rate_recurring}
            services={services}
          >
            <Button className="rounded-full flex-1" size="sm">
              Contact {firstName}
            </Button>
          </BookingRequestForm>
          <FavoriteButton isFavorite={isFavorite} loading={favLoading} onClick={toggleFavorite} size="md" />
        </div>
      )}
    </motion.section>
  );
};

export default NannyProfileHero;
