import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/utils/postalCodeLookup";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorite } from "@/hooks/useFavorite";
import BookingRequestForm from "@/components/BookingRequestForm";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "@/hooks/use-toast";

import MatchScore from "@/components/MatchScore";
import MatchingSuggestions from "@/components/MatchingSuggestions";
import NannyProfileHero from "@/components/nanny-profile/NannyProfileHero";
import NannyProfileContent from "@/components/nanny-profile/NannyProfileContent";
import QuickFitSummary from "@/components/nanny-profile/QuickFitSummary";
import ScrollReveal from "@/components/nanny-profile/ScrollReveal";

const NannyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [nannyProfile, setNannyProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<{ day: string; period: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyLocation, setFamilyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [familyLanguages, setFamilyLanguages] = useState<string[]>([]);
  const { isFavorite, loading: favLoading, toggle: toggleFavorite } = useFavorite(id);

  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      try {
        const [
          { data: np, error: npErr },
          { data: p, error: pErr },
          { data: ph },
          { data: slots },
        ] = await Promise.all([
          supabase.from("nanny_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("nanny_photos").select("*").eq("user_id", id).order("display_order"),
          supabase.from("availability_slots").select("day, period").eq("user_id", id),
        ]);

        let resolvedProfile: any = p;
        let resolvedNannyProfile: any = np;

        if (!resolvedProfile) {
          const { data: publicProfiles, error: publicErr } = await supabase.rpc("get_public_nanny_profiles");
          if (publicErr) {
            console.error("[NannyProfile] public profile fallback error:", publicErr);
          } else {
            const publicProfile = publicProfiles?.find((item) => item.user_id === id) ?? null;
            if (publicProfile) {
              resolvedProfile = {
                user_id: publicProfile.user_id,
                full_name: publicProfile.full_name,
                avatar_url: publicProfile.avatar_url,
                languages: publicProfile.languages,
                location: [publicProfile.city, publicProfile.country].filter(Boolean).join(", ") || null,
              } as any;
              resolvedNannyProfile = (resolvedNannyProfile ?? publicProfile) as any;
            }
          }
        }

        if (npErr) console.error("[NannyProfile] nanny_profiles error:", npErr);
        if (pErr) console.error("[NannyProfile] profiles error:", pErr);

        // Check if profile is approved (only approved profiles should be publicly viewable)
        const isOwnProfile = user?.id === id;
        const isApproved = resolvedNannyProfile?.profile_status === "approved";
        
        if (!isOwnProfile && !isApproved) {
          console.warn("[NannyProfile] Profile not approved, redirecting");
          setNannyProfile(null);
          setProfile(null);
          setError("This profile is not available.");
          setLoading(false);
          return;
        }

        setNannyProfile(resolvedNannyProfile);
        setProfile(resolvedProfile);
        setPhotos(ph || []);
        setAvailabilitySlots(slots || []);
      } catch (err) {
        console.error("[NannyProfile] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const fetchFamilyData = async () => {
      const [{ data: fp }, { data: fProfile }] = await Promise.all([
        supabase.from("family_profiles").select("latitude, longitude").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("languages").eq("user_id", user.id).maybeSingle(),
      ]);
      if (fp?.latitude && fp?.longitude) {
        setFamilyLocation({ lat: Number(fp.latitude), lng: Number(fp.longitude) });
      }
      if (fProfile?.languages) setFamilyLanguages(fProfile.languages);
    };
    fetchFamilyData();
  }, [user]);

  const distanceKm = useMemo(() => {
    if (!familyLocation || !nannyProfile?.latitude || !nannyProfile?.longitude) return null;
    return haversineKm(
      familyLocation.lat, familyLocation.lng,
      Number(nannyProfile.latitude), Number(nannyProfile.longitude)
    );
  }, [familyLocation, nannyProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!nannyProfile || !profile) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || "Profile not found."}</p>
        <Link to="/search">
          <Button variant="outline" className="rounded-full"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Search</Button>
        </Link>
      </div>
    );
  }

  const handleMessage = async () => {
    if (!user || !id) { navigate("/login"); return; }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("family_user_id", user.id)
      .eq("nanny_user_id", id)
      .maybeSingle();
    if (existing) { navigate("/messages"); return; }
    const { error } = await supabase.from("conversations").insert({
      family_user_id: user.id,
      nanny_user_id: id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    navigate("/messages");
  };

  const mainPhoto = photos.find(p => p.is_primary)?.photo_url || photos[0]?.photo_url || profile.avatar_url || "/placeholder.svg";
  const firstName = profile.full_name?.split(" ")[0] || "Nanny";
  const isOwner = user?.id === id || hasAdminAccess;
  const services = [
    nannyProfile.offers_date_night && "Date-Night",
    nannyProfile.offers_overnight && "Overnight",
    nannyProfile.offers_after_school && "After-School",
    nannyProfile.offers_weekend_holiday && "Weekend & Holiday",
    nannyProfile.offers_full_time && "Full-Time",
    nannyProfile.offers_part_time && "Part-Time",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-secondary">
      {/* Compact nav */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/" className="font-display text-lg font-bold text-primary">NannyElite</Link>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Link to="/edit-profile">
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs h-7">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </Link>
            )}
            <Link to="/dashboard"><Button variant="ghost" size="sm" className="rounded-full text-xs h-7">Dashboard</Button></Link>
          </div>
        </div>
      </header>

      {/* Single-column layout */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-24 sm:pb-6 space-y-4">
        {/* 1. Decision Card (Hero) */}
        <NannyProfileHero
          profile={profile}
          nannyProfile={nannyProfile}
          mainPhoto={mainPhoto}
          isFavorite={isFavorite}
          favLoading={favLoading}
          toggleFavorite={toggleFavorite}
          distanceKm={distanceKm}
          onMessage={handleMessage}
          nannyUserId={id!}
          isOwner={isOwner}
        />

        {/* 2. Quick Fit Summary */}
        <QuickFitSummary
          profile={profile}
          nannyProfile={nannyProfile}
          availabilitySlots={availabilitySlots}
        />

        {/* 3-11. Content sections */}
        <NannyProfileContent
          profile={profile}
          nannyProfile={nannyProfile}
          photos={photos}
          nannyUserId={id!}
          onMessage={handleMessage}
          isOwner={isOwner}
          availabilitySlots={availabilitySlots}
        />

        {/* Match Score */}
        {!isOwner && (
          <ScrollReveal>
            <MatchScore
              nannyProfile={{ ...nannyProfile, languages: profile.languages }}
              familyLanguages={familyLanguages}
              familyLat={familyLocation?.lat}
              familyLng={familyLocation?.lng}
              distanceKm={distanceKm}
              availabilitySlots={availabilitySlots}
            />
          </ScrollReveal>
        )}

        {/* Matching Suggestions */}
        {!isOwner && (
          <ScrollReveal>
            <MatchingSuggestions
              viewerRole="family"
              viewerLat={familyLocation?.lat}
              viewerLng={familyLocation?.lng}
              viewerLanguages={familyLanguages}
              excludeNannyId={id}
            />
          </ScrollReveal>
        )}

      </main>

      {/* Sticky bottom bar – mobile only */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border p-2.5 flex items-center gap-2 sm:hidden">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{firstName}</p>
          {nannyProfile.hourly_rate_spot && (
            <p className="font-semibold text-xs text-foreground">CHF {Number(nannyProfile.hourly_rate_spot).toFixed(0)}/hr</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full shrink-0 h-8" onClick={handleMessage}>
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <BookingRequestForm
          nannyUserId={id!}
          nannyName={firstName}
          hourlyRateSpot={nannyProfile.hourly_rate_spot}
          hourlyRateRecurring={nannyProfile.hourly_rate_recurring}
          services={services}
        >
          <Button size="sm" className="rounded-full shrink-0 h-8 text-xs">Contact</Button>
        </BookingRequestForm>
      </div>
    </div>
  );
};

export default NannyProfile;
