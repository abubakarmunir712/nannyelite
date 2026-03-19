import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateMatchScore } from "@/utils/matchScore";
import { haversineKm } from "@/utils/postalCodeLookup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Clock, Star, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface NannySuggestion {
  userId: string;
  name: string;
  photo: string | null;
  distance: number | null;
  hourlyRate: number | null;
  languages: string[];
  availableDays: string[];
  yearsExp: number;
  matchScore: number;
  reasons: string[];
  city: string | null;
}

interface FamilySuggestion {
  userId: string;
  name: string;
  avatar: string | null;
  distance: number | null;
  languages: string[];
  city: string | null;
  childrenCount: number;
  matchScore: number;
  reasons: string[];
  householdDescription: string | null;
}

interface Props {
  /** "family" = show nanny suggestions; "nanny" = show family suggestions */
  viewerRole: "family" | "nanny";
  /** Current user's lat/lng */
  viewerLat?: number | null;
  viewerLng?: number | null;
  /** Languages of the viewer */
  viewerLanguages?: string[];
  /** Exclude this nanny from suggestions (when viewing their profile) */
  excludeNannyId?: string;
  limit?: number;
}

const DAY_FLAGS = [
  { key: "available_monday", label: "Mon" },
  { key: "available_tuesday", label: "Tue" },
  { key: "available_wednesday", label: "Wed" },
  { key: "available_thursday", label: "Thu" },
  { key: "available_friday", label: "Fri" },
  { key: "available_saturday", label: "Sat" },
  { key: "available_sunday", label: "Sun" },
] as const;

const MatchingSuggestions = ({
  viewerRole,
  viewerLat,
  viewerLng,
  viewerLanguages = [],
  excludeNannyId,
  limit = 8,
}: Props) => {
  const { user } = useAuth();
  const [nannySuggestions, setNannySuggestions] = useState<NannySuggestion[]>([]);
  const [familySuggestions, setFamilySuggestions] = useState<FamilySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (viewerRole === "family") {
      loadNannySuggestions();
    } else {
      loadFamilySuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, viewerRole, viewerLat, viewerLng]);

  const loadNannySuggestions = async () => {
    setLoading(true);
    try {
      const { data: nannies } = await supabase
        .from("nanny_profiles")
        .select("user_id, city, state, country, latitude, longitude, years_of_experience, hourly_rate_spot, hourly_rate_recurring, available_monday, available_tuesday, available_wednesday, available_thursday, available_friday, available_saturday, available_sunday, offers_date_night, offers_overnight, offers_after_school, offers_weekend_holiday, offers_full_time, offers_part_time, work_radius_km")
        .eq("profile_visible", true)
        .eq("onboarding_completed", true)
        .limit(50);

      if (!nannies?.length) { setLoading(false); return; }

      const userIds = nannies.map(n => n.user_id);
      const [{ data: profiles }, { data: photos }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, languages").in("user_id", userIds),
        supabase.from("nanny_photos").select("user_id, photo_url").eq("is_primary", true).in("user_id", userIds),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const photoMap = new Map((photos || []).map(p => [p.user_id, p.photo_url]));

      const results: NannySuggestion[] = nannies
        .filter(n => n.user_id !== excludeNannyId && n.user_id !== user!.id)
        .map(n => {
          const prof = profileMap.get(n.user_id);
          const dist = (viewerLat && viewerLng && n.latitude && n.longitude)
            ? haversineKm(viewerLat, viewerLng, Number(n.latitude), Number(n.longitude))
            : null;

          const days = DAY_FLAGS.filter(d => (n as any)[d.key]).map(d => d.label);
          const services: string[] = [];
          if (n.offers_full_time) services.push("full_time");
          if (n.offers_part_time) services.push("part_time");
          if (n.offers_date_night) services.push("date_night");
          if (n.offers_overnight) services.push("overnight");
          if (n.offers_after_school) services.push("after_school");
          if (n.offers_weekend_holiday) services.push("weekend_holiday");

          const { score, reasons } = calculateMatchScore({
            familyLat: viewerLat,
            familyLng: viewerLng,
            familyLanguages: viewerLanguages,
            nannyLat: n.latitude ? Number(n.latitude) : null,
            nannyLng: n.longitude ? Number(n.longitude) : null,
            nannyLanguages: prof?.languages || [],
            nannyYearsExperience: n.years_of_experience || 0,
            nannyServices: services,
            nannyAvailableDays: days,
            nannyAvailablePeriods: [],
            distanceKm: dist,
          });

          return {
            userId: n.user_id,
            name: prof?.full_name || "Nanny",
            photo: photoMap.get(n.user_id) || null,
            distance: dist ? Math.round(dist) : null,
            hourlyRate: n.hourly_rate_recurring || n.hourly_rate_spot || null,
            languages: prof?.languages || [],
            availableDays: days,
            yearsExp: n.years_of_experience || 0,
            matchScore: score,
            reasons,
            city: n.city,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      setNannySuggestions(results);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadFamilySuggestions = async () => {
    setLoading(true);
    try {
      // Get nanny's own profile for matching
      const { data: myNanny } = await supabase
        .from("nanny_profiles")
        .select("latitude, longitude, years_of_experience, offers_full_time, offers_part_time, offers_date_night, offers_overnight, offers_after_school, offers_weekend_holiday, available_monday, available_tuesday, available_wednesday, available_thursday, available_friday, available_saturday, available_sunday")
        .eq("user_id", user!.id)
        .single();

      const { data: families } = await supabase
        .from("family_profiles")
        .select("user_id, city, state, country, latitude, longitude, household_description")
        .eq("onboarding_completed", true)
        .limit(50);

      if (!families?.length) { setLoading(false); return; }

      const userIds = families.map(f => f.user_id);
      const [{ data: profiles }, { data: childrenData }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, languages, avatar_url").in("user_id", userIds),
        supabase.from("children").select("family_user_id").in("family_user_id", userIds),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const childCounts = new Map<string, number>();
      (childrenData || []).forEach(c => {
        childCounts.set(c.family_user_id, (childCounts.get(c.family_user_id) || 0) + 1);
      });

      const nannyLat = myNanny?.latitude ? Number(myNanny.latitude) : (viewerLat || null);
      const nannyLng = myNanny?.longitude ? Number(myNanny.longitude) : (viewerLng || null);

      const results: FamilySuggestion[] = families
        .filter(f => f.user_id !== user!.id)
        .map(f => {
          const prof = profileMap.get(f.user_id);
          const dist = (nannyLat && nannyLng && f.latitude && f.longitude)
            ? haversineKm(nannyLat, nannyLng, Number(f.latitude), Number(f.longitude))
            : null;

          const { score, reasons } = calculateMatchScore({
            familyLat: f.latitude ? Number(f.latitude) : null,
            familyLng: f.longitude ? Number(f.longitude) : null,
            familyLanguages: prof?.languages || [],
            nannyLat: nannyLat,
            nannyLng: nannyLng,
            nannyLanguages: viewerLanguages,
            nannyYearsExperience: myNanny?.years_of_experience || 0,
            nannyServices: [],
            nannyAvailableDays: myNanny ? DAY_FLAGS.filter(d => (myNanny as any)[d.key]).map(d => d.label) : [],
            nannyAvailablePeriods: [],
            distanceKm: dist,
          });

          return {
            userId: f.user_id,
            name: prof?.full_name || "Family",
            avatar: prof?.avatar_url || null,
            distance: dist ? Math.round(dist) : null,
            languages: prof?.languages || [],
            city: f.city,
            childrenCount: childCounts.get(f.user_id) || 0,
            matchScore: score,
            reasons,
            householdDescription: f.household_description,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      setFamilySuggestions(results);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {viewerRole === "family" ? "Similar Nannies Nearby" : "Families Looking for You"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = viewerRole === "family" ? nannySuggestions : familySuggestions;
  if (!items.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">
        {viewerRole === "family" ? "Similar Nannies Nearby" : "Families Looking for a Nanny"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {viewerRole === "family"
          ? nannySuggestions.map(n => <NannyCard key={n.userId} nanny={n} />)
          : familySuggestions.map(f => <FamilyCard key={f.userId} family={f} />)
        }
      </div>
    </div>
  );
};

/* ─── Nanny suggestion card ─── */
const NannyCard = ({ nanny }: { nanny: NannySuggestion }) => {
  const scoreColor = nanny.matchScore >= 80 ? "text-emerald-600" : nanny.matchScore >= 60 ? "text-amber-600" : "text-muted-foreground";

  return (
    <Link
      to={`/nanny/${nanny.userId}`}
      className="group flex gap-3 bg-card rounded-xl border border-border p-3.5 hover:shadow-md hover:border-primary/20 transition-all"
    >
      {/* Photo */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {nanny.photo ? (
          <img src={nanny.photo} alt={nanny.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
            {nanny.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + Score */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{nanny.name}</p>
          <Badge variant="secondary" className={`shrink-0 text-xs font-bold ${scoreColor}`}>
            {nanny.matchScore}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
          {nanny.distance != null && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {nanny.distance} km
            </span>
          )}
          {nanny.hourlyRate && (
            <span className="font-medium text-foreground">
              CHF {Number(nanny.hourlyRate).toFixed(0)}/hr
            </span>
          )}
          {nanny.yearsExp > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3" /> {nanny.yearsExp}y exp
            </span>
          )}
        </div>

        {/* Languages */}
        {nanny.languages.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{nanny.languages.slice(0, 3).join(", ")}</span>
          </div>
        )}

        {/* Availability */}
        {nanny.availableDays.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">{nanny.availableDays.join(", ")}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

/* ─── Family suggestion card ─── */
const FamilyCard = ({ family }: { family: FamilySuggestion }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scoreColor = family.matchScore >= 80 ? "text-emerald-600" : family.matchScore >= 60 ? "text-amber-600" : "text-muted-foreground";

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("family_user_id", family.userId)
      .eq("nanny_user_id", user.id)
      .single();
    if (existing) { navigate("/messages"); return; }
    const { error } = await supabase.from("conversations").insert({
      family_user_id: family.userId,
      nanny_user_id: user.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    navigate("/messages");
  };

  return (
    <div className="flex gap-3 bg-card rounded-xl border border-border p-3.5">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {family.avatar ? (
          <img src={family.avatar} alt={family.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
            {family.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{family.name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-6 w-6 p-0"
              onClick={handleMessage}
              title="Message"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
            <Badge variant="secondary" className={`text-xs font-bold ${scoreColor}`}>
              {family.matchScore}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
          {family.distance != null && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {family.distance} km
            </span>
          )}
          {family.city && <span>{family.city}</span>}
          {family.childrenCount > 0 && (
            <span>{family.childrenCount} child{family.childrenCount > 1 ? "ren" : ""}</span>
          )}
        </div>

        {family.languages.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{family.languages.slice(0, 3).join(", ")}</span>
          </div>
        )}

        {family.reasons.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {family.reasons[0]}
          </p>
        )}
      </div>
    </div>
  );
};

export default MatchingSuggestions;
