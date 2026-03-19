import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import NannyMap from "@/components/NannyMap";
import { calculateMatchScore } from "@/utils/matchScore";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, MapPin, Clock, Globe, Shield, SlidersHorizontal,
  X, Baby, ChefHat, Car, BookOpen, Heart, Star, Cross, Zap, MessageCircle, Home, Briefcase,
} from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";
import FavoriteButton from "@/components/FavoriteButton";
import TrustBadges, { buildBadges } from "@/components/TrustBadges";

interface NannyResult {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  languages: string[] | null;
  location: string | null;
  email: string | null;
}

const getDisplayName = (profile: NannyResult, nationality: string | null): string => {
  if (profile.full_name) return profile.full_name;
  if (profile.email) {
    const local = profile.email.split("@")[0];
    // Capitalize and clean up email prefix (e.g. "jane.doe" -> "Jane")
    const name = local.split(/[._-]/)[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (nationality) return `Caregiver (${nationality})`;
  return "Caregiver";
};

interface NannyProfileResult {
  user_id: string;
  nationality: string | null;
  years_of_experience: number;
  bio: string | null;
  hourly_rate_spot: number | null;
  hourly_rate_recurring: number | null;
  babysitting_rate_chf: number | null;
  part_time_childcare_rate_chf: number | null;
  experience_infants: boolean;
  experience_toddlers: boolean;
  experience_preschool: boolean;
  experience_school_age: boolean;
  experience_teenagers: boolean;
  experience_special_needs: boolean;
  has_first_aid: boolean;
  has_cpr: boolean;
  has_early_childhood_cert: boolean;
  offers_date_night: boolean;
  offers_overnight: boolean;
  offers_after_school: boolean;
  offers_weekend_holiday: boolean;
  offers_full_time: boolean;
  offers_part_time: boolean;
  can_cook: boolean;
  can_drive: boolean;
  can_help_homework: boolean;
  id_verified: boolean;
  background_check_passed: boolean;
  identity_verified: boolean;
  manual_identity_verified: boolean;
  available_monday: boolean;
  available_tuesday: boolean;
  available_wednesday: boolean;
  available_thursday: boolean;
  available_friday: boolean;
  available_saturday: boolean;
  available_sunday: boolean;
  available_school_holidays: boolean;
  available_cleaning_only: boolean;
  caregiver_types: string[] | null;
  onboarding_completed: boolean;
  profile_visible: boolean;
  latitude: number | null;
  longitude: number | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  avg_rating: number | null;
  total_reviews: number;
  work_radius_km: number | null;
}

interface CombinedNanny {
  profile: NannyResult;
  nannyProfile: NannyProfileResult;
  photo: string | null;
  distance?: number;
  referenceCount?: number;
  averageRating?: number;
  matchScore?: number;
  approvedCertificates?: { certificate_type: string }[];
  emailVerified?: boolean;
}

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SearchNannies = ({ initialCityFilter }: { initialCityFilter?: string }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [familyLanguages, setFamilyLanguages] = useState<string[]>([]);
  const [nannies, setNannies] = useState<CombinedNanny[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialCityFilter || "");
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredNannyId, setHoveredNannyId] = useState<string | null>(null);

  // Filters
  const [maxRate, setMaxRate] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterFirstAid, setFilterFirstAid] = useState(false);
  const [filterSpecialNeeds, setFilterSpecialNeeds] = useState(false);
  const [filterAgeGroups, setFilterAgeGroups] = useState({
    infants: false, toddlers: false, preschool: false, schoolAge: false, teenagers: false,
  });
  const [filterServices, setFilterServices] = useState({
    dateNight: false, overnight: false, afterSchool: false, weekend: false, fullTime: false, partTime: false,
  });
  const [filterDays, setFilterDays] = useState({
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
  });

  const [maxDistance, setMaxDistance] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [filterSchoolHolidays, setFilterSchoolHolidays] = useState(false);
  const [filterCleaning, setFilterCleaning] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "rating" | "distance" | "price_low" | "price_high">("match");

  // Load family languages for match scoring
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("languages").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.languages) setFamilyLanguages(data.languages); });
  }, [user]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGeoLoading(false); },
      () => setGeoLoading(false)
    );
  };

  useEffect(() => {
    const fetchNannies = async () => {
      // Build server-side query with key filters to reduce payload
      let nannyQuery = supabase
        .from("nanny_profiles")
        .select("*")
        .eq("onboarding_completed", true)
        .eq("profile_visible", true)
        .filter("profile_status", "eq", "approved");

      // Apply server-side filters when possible
      if (maxRate) {
        nannyQuery = nannyQuery.lte("hourly_rate_recurring", parseFloat(maxRate));
      }
      if (minExperience) {
        nannyQuery = nannyQuery.gte("years_of_experience", parseInt(minExperience));
      }
      if (filterVerified) {
        nannyQuery = nannyQuery.eq("id_verified", true);
      }
      if (filterFirstAid) {
        nannyQuery = nannyQuery.eq("has_first_aid", true);
      }
      if (filterSpecialNeeds) {
        nannyQuery = nannyQuery.eq("experience_special_needs", true);
      }
      if (filterSchoolHolidays) {
        nannyQuery = nannyQuery.eq("available_school_holidays", true);
      }
      if (filterCleaning) {
        nannyQuery = nannyQuery.eq("available_cleaning_only", true);
      }

      // Day availability filters
      if (filterDays.mon) nannyQuery = nannyQuery.eq("available_monday", true);
      if (filterDays.tue) nannyQuery = nannyQuery.eq("available_tuesday", true);
      if (filterDays.wed) nannyQuery = nannyQuery.eq("available_wednesday", true);
      if (filterDays.thu) nannyQuery = nannyQuery.eq("available_thursday", true);
      if (filterDays.fri) nannyQuery = nannyQuery.eq("available_friday", true);
      if (filterDays.sat) nannyQuery = nannyQuery.eq("available_saturday", true);
      if (filterDays.sun) nannyQuery = nannyQuery.eq("available_sunday", true);

      // Service type filters
      if (filterServices.dateNight) nannyQuery = nannyQuery.eq("offers_date_night", true);
      if (filterServices.overnight) nannyQuery = nannyQuery.eq("offers_overnight", true);
      if (filterServices.afterSchool) nannyQuery = nannyQuery.eq("offers_after_school", true);
      if (filterServices.weekend) nannyQuery = nannyQuery.eq("offers_weekend_holiday", true);
      if (filterServices.fullTime) nannyQuery = nannyQuery.eq("offers_full_time", true);
      if (filterServices.partTime) nannyQuery = nannyQuery.eq("offers_part_time", true);

      // Age group filters
      if (filterAgeGroups.infants) nannyQuery = nannyQuery.eq("experience_infants", true);
      if (filterAgeGroups.toddlers) nannyQuery = nannyQuery.eq("experience_toddlers", true);
      if (filterAgeGroups.preschool) nannyQuery = nannyQuery.eq("experience_preschool", true);
      if (filterAgeGroups.schoolAge) nannyQuery = nannyQuery.eq("experience_school_age", true);
      if (filterAgeGroups.teenagers) nannyQuery = nannyQuery.eq("experience_teenagers", true);

      nannyQuery = nannyQuery.limit(300);

      const [{ data: profiles }, { data: nannyProfiles }, { data: photos }, { data: allPhotos }, { data: approvedCerts }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, languages, location, email").eq("role", "nanny").limit(300),
        nannyQuery,
        supabase.from("nanny_photos").select("user_id, photo_url, is_primary").eq("is_primary", true).limit(300),
        supabase.from("nanny_photos").select("user_id, photo_url, display_order").order("display_order", { ascending: true }).limit(300),
        Promise.resolve(supabase.from("user_certificates" as any).select("user_id, certificate_type").eq("status", "approved")).catch(() => ({ data: [] })),
      ]);

      if (!profiles || !nannyProfiles) { setLoading(false); return; }

      // Fetch contacts for private profile visibility (favorites + conversations)
      let contactIds = new Set<string>();
      if (user) {
        const [{ data: favs }, { data: convos }] = await Promise.all([
          supabase.from("favorite_nannies").select("nanny_user_id").eq("family_user_id", user.id),
          supabase.from("conversations").select("family_user_id, nanny_user_id")
            .or(`family_user_id.eq.${user.id},nanny_user_id.eq.${user.id}`),
        ]);
        (favs || []).forEach((f: any) => contactIds.add(f.nanny_user_id));
        (convos || []).forEach((c: any) => {
          contactIds.add(c.family_user_id);
          contactIds.add(c.nanny_user_id);
        });
      }

      // Group approved certs by user_id
      const certsByUser: Record<string, { certificate_type: string }[]> = {};
      (approvedCerts || []).forEach((c: any) => {
        if (!certsByUser[c.user_id]) certsByUser[c.user_id] = [];
        certsByUser[c.user_id].push({ certificate_type: c.certificate_type });
      });

      const combined: CombinedNanny[] = nannyProfiles
        .filter((np) => {
          // Only hide explicitly rejected profiles; pending/null/approved are shown
          if (np.profile_status === "rejected") return false;
          // Enforce profile visibility
          const prof = profiles.find((p) => p.user_id === np.user_id);
          const visibility = (prof as any)?.profile_visibility || "public";
          if (visibility === "public") return true;
          if (visibility === "members") return !!user;
          if (visibility === "private") return !!user && contactIds.has(np.user_id);
          return true;
        })
        .map((np) => {
        const prof = profiles.find((p) => p.user_id === np.user_id);
        const primaryPhoto = photos?.find((ph) => ph.user_id === np.user_id);
        const fallbackPhoto = allPhotos?.find((ph) => ph.user_id === np.user_id);
        return {
          profile: prof || { user_id: np.user_id, full_name: null, avatar_url: null, languages: null, location: null, email: null },
          nannyProfile: np as NannyProfileResult,
          photo: primaryPhoto?.photo_url || fallbackPhoto?.photo_url || prof?.avatar_url || null,
          referenceCount: (np as any).total_reviews || 0,
          averageRating: (np as any).avg_rating != null ? Number((np as any).avg_rating) : undefined,
          approvedCertificates: certsByUser[np.user_id] || [],
          emailVerified: true,
        };
      });

      setNannies(combined);
      setLoading(false);
    };
    fetchNannies();
  }, [maxRate, minExperience, filterVerified, filterFirstAid, filterSpecialNeeds, filterSchoolHolidays, filterCleaning, filterAgeGroups, filterServices, filterDays, user]);

  const filtered = useMemo(() => {
    const results = nannies.filter((n) => {
      const np = n.nannyProfile;
      const p = n.profile;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          (p.full_name || "").toLowerCase().includes(q) ||
          (np.nationality || "").toLowerCase().includes(q) ||
          (np.bio || "").toLowerCase().includes(q) ||
          (p.languages || []).some((l) => l.toLowerCase().includes(q)) ||
          (p.location || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (maxRate && np.hourly_rate_recurring && np.hourly_rate_recurring > parseFloat(maxRate)) return false;
      if (maxRate && !np.hourly_rate_recurring && np.hourly_rate_spot && np.hourly_rate_spot > parseFloat(maxRate)) return false;
      if (minExperience && np.years_of_experience < parseInt(minExperience)) return false;
      if (filterVerified && !np.id_verified) return false;
      if (filterFirstAid && !np.has_first_aid) return false;
      if (filterSpecialNeeds && !np.experience_special_needs) return false;
      if (filterSchoolHolidays && !np.available_school_holidays) return false;
      if (filterCleaning && !np.available_cleaning_only) return false;

      if (filterAgeGroups.infants && !np.experience_infants) return false;
      if (filterAgeGroups.toddlers && !np.experience_toddlers) return false;
      if (filterAgeGroups.preschool && !np.experience_preschool) return false;
      if (filterAgeGroups.schoolAge && !np.experience_school_age) return false;
      if (filterAgeGroups.teenagers && !np.experience_teenagers) return false;

      if (filterServices.dateNight && !np.offers_date_night) return false;
      if (filterServices.overnight && !np.offers_overnight) return false;
      if (filterServices.afterSchool && !np.offers_after_school) return false;
      if (filterServices.weekend && !np.offers_weekend_holiday) return false;
      if (filterServices.fullTime && !np.offers_full_time) return false;
      if (filterServices.partTime && !np.offers_part_time) return false;

      if (filterDays.mon && !np.available_monday) return false;
      if (filterDays.tue && !np.available_tuesday) return false;
      if (filterDays.wed && !np.available_wednesday) return false;
      if (filterDays.thu && !np.available_thursday) return false;
      if (filterDays.fri && !np.available_friday) return false;
      if (filterDays.sat && !np.available_saturday) return false;
      if (filterDays.sun && !np.available_sunday) return false;

      if (userLat && userLng && np.latitude && np.longitude) {
        const dist = haversineKm(userLat, userLng, Number(np.latitude), Number(np.longitude));
        n.distance = Math.round(dist);
        if (maxDistance && dist > parseFloat(maxDistance)) return false;
        const nannyRadius = np.work_radius_km || 15;
        if (dist > nannyRadius * 3) return false;
      }

      return true;
    });

    // Calculate match scores and sort by highest first
    results.forEach((n) => {
      const np = n.nannyProfile;
      const nannyServices: string[] = [];
      if (np.offers_date_night) nannyServices.push("date_night");
      if (np.offers_overnight) nannyServices.push("overnight");
      if (np.offers_after_school) nannyServices.push("after_school");
      if (np.offers_weekend_holiday) nannyServices.push("weekend_holiday");
      if (np.offers_full_time) nannyServices.push("full_time");
      if (np.offers_part_time) nannyServices.push("part_time");

      const days: string[] = [];
      if (np.available_monday) days.push("Monday");
      if (np.available_tuesday) days.push("Tuesday");
      if (np.available_wednesday) days.push("Wednesday");
      if (np.available_thursday) days.push("Thursday");
      if (np.available_friday) days.push("Friday");
      if (np.available_saturday) days.push("Saturday");
      if (np.available_sunday) days.push("Sunday");

      const { score } = calculateMatchScore({
        familyLat: userLat,
        familyLng: userLng,
        familyLanguages,
        nannyLat: np.latitude ? Number(np.latitude) : null,
        nannyLng: np.longitude ? Number(np.longitude) : null,
        nannyLanguages: n.profile.languages || [],
        nannyYearsExperience: np.years_of_experience || 0,
        nannyServices,
        nannyAvailableDays: days,
        nannyAvailablePeriods: [],
        distanceKm: n.distance ?? null,
      });
      n.matchScore = score;
    });

    // Default sort by match score
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    return results;
  }, [nannies, searchQuery, maxRate, minExperience, filterVerified, filterFirstAid, filterSpecialNeeds, filterSchoolHolidays, filterCleaning, filterAgeGroups, filterServices, filterDays, maxDistance, userLat, userLng, familyLanguages]);

  const sortedProfiles = useMemo(() => {
    const sorted = [...filtered];
    switch (sortBy) {
      case "rating":
        return sorted.sort((a, b) => {
          const rA = a.nannyProfile.avg_rating || 0;
          const rB = b.nannyProfile.avg_rating || 0;
          if (rB !== rA) return rB - rA;
          return (b.nannyProfile.total_reviews || 0) - (a.nannyProfile.total_reviews || 0);
        });
      case "distance":
        if (!userLat || !userLng) return sorted;
        return sorted.sort((a, b) => {
          const dA = a.nannyProfile.latitude && a.nannyProfile.longitude
            ? haversineKm(userLat, userLng, Number(a.nannyProfile.latitude), Number(a.nannyProfile.longitude)) : 9999;
          const dB = b.nannyProfile.latitude && b.nannyProfile.longitude
            ? haversineKm(userLat, userLng, Number(b.nannyProfile.latitude), Number(b.nannyProfile.longitude)) : 9999;
          return dA - dB;
        });
      case "price_low":
        return sorted.sort((a, b) => {
          const pA = a.nannyProfile.babysitting_rate_chf || a.nannyProfile.hourly_rate_spot || 999;
          const pB = b.nannyProfile.babysitting_rate_chf || b.nannyProfile.hourly_rate_spot || 999;
          return pA - pB;
        });
      case "price_high":
        return sorted.sort((a, b) => {
          const pA = a.nannyProfile.babysitting_rate_chf || a.nannyProfile.hourly_rate_spot || 0;
          const pB = b.nannyProfile.babysitting_rate_chf || b.nannyProfile.hourly_rate_spot || 0;
          return pB - pA;
        });
      case "match":
      default:
        return sorted;
    }
  }, [filtered, sortBy, userLat, userLng]);

  const activeFilterCount = [
    maxRate, minExperience, maxDistance, filterVerified, filterFirstAid, filterSpecialNeeds, filterSchoolHolidays, filterCleaning,
    ...Object.values(filterAgeGroups), ...Object.values(filterServices), ...Object.values(filterDays),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setMaxRate(""); setMinExperience(""); setMaxDistance(""); setFilterVerified(false); setFilterFirstAid(false); setFilterSpecialNeeds(false); setFilterSchoolHolidays(false); setFilterCleaning(false);
    setFilterAgeGroups({ infants: false, toddlers: false, preschool: false, schoolAge: false, teenagers: false });
    setFilterServices({ dateNight: false, overnight: false, afterSchool: false, weekend: false, fullTime: false, partTime: false });
    setFilterDays({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false });
  };

  const certs = (np: NannyProfileResult) => [
    np.has_first_aid && "First Aid", np.has_cpr && "CPR", np.has_early_childhood_cert && "Early Childhood",
  ].filter(Boolean);

  return (
    <div className="h-screen flex flex-col bg-secondary">
      <SEO title="Find a Nanny – Search Verified Caregivers" description="Search and find verified nannies near you in Switzerland. Filter by experience, services, availability, and more." path="/search" />
      {/* Compact Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" data-testid="search-logo-link" className="font-display text-lg font-bold text-primary flex-shrink-0">NannyElite</Link>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="search-input"
              placeholder={t("search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              data-testid="search-filters-toggle"
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-full gap-1.5 h-8 text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("search.filters")}
              {activeFilterCount > 0 && (
                <span className="bg-primary-foreground text-primary text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Link to="/dashboard" data-testid="search-dashboard-link">
              <Button variant="ghost" size="sm" className="h-8 text-xs">{t("search.dashboard")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-card border-b border-border px-4 py-4 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-foreground">{t("search.filters")}</h3>
            {activeFilterCount > 0 && (
              <button data-testid="search-clear-filters" onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                <X className="h-3 w-3" /> {t("search.clearAll")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("search.maxRate")}</Label>
              <Input data-testid="filter-max-rate" type="number" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} placeholder="e.g. 30" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("search.minExperience")}</Label>
              <Input data-testid="filter-min-experience" type="number" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} placeholder="e.g. 3" className="h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Checkbox data-testid="filter-verified" checked={filterVerified} onCheckedChange={(c) => setFilterVerified(!!c)} id="verified" />
              <Label htmlFor="verified" className="text-xs cursor-pointer flex items-center gap-1"><Shield className="h-3 w-3" /> {t("search.verified")}</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Checkbox data-testid="filter-first-aid" checked={filterFirstAid} onCheckedChange={(c) => setFilterFirstAid(!!c)} id="firstaid" />
              <Label htmlFor="firstaid" className="text-xs cursor-pointer">{t("search.firstAid")}</Label>
            </div>
          </div>

          {/* Proximity */}
          <div className="flex gap-2 items-center mb-3">
            <Input data-testid="filter-max-distance" type="number" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} placeholder={t("search.maxKm")} className="h-8 text-sm w-28" />
            <Button data-testid="search-detect-location" variant="outline" size="sm" onClick={detectLocation} disabled={geoLoading} className="gap-1 h-8 text-xs">
              <MapPin className="h-3 w-3" />
              {geoLoading ? "..." : userLat ? `✓ ${t("search.located")}` : t("search.myLocation")}
            </Button>
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "infants" as const, label: t("search.infants") }, { key: "toddlers" as const, label: t("search.toddlers") },
              { key: "preschool" as const, label: t("search.preschool") }, { key: "schoolAge" as const, label: t("search.schoolAge") },
              { key: "teenagers" as const, label: t("search.teenagers") },
            ].map((a) => (
              <button key={a.key} data-testid={`filter-age-${a.key}`} onClick={() => setFilterAgeGroups((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  filterAgeGroups[a.key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{a.label}</button>
            ))}
            <span className="w-px h-5 bg-border mx-1 self-center" />
            {[
              { key: "dateNight" as const, label: t("search.dateNight") }, { key: "overnight" as const, label: t("search.overnight") },
              { key: "afterSchool" as const, label: t("search.afterSchool") }, { key: "weekend" as const, label: t("search.weekend") },
              { key: "fullTime" as const, label: t("search.fullTime") }, { key: "partTime" as const, label: t("search.partTime") },
            ].map((s) => (
              <button key={s.key} data-testid={`filter-service-${s.key}`} onClick={() => setFilterServices((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  filterServices[s.key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{s.label}</button>
            ))}
            <span className="w-px h-5 bg-border mx-1 self-center" />
            {[
              { key: "mon" as const, label: t("search.dayMon") }, { key: "tue" as const, label: t("search.dayTue") }, { key: "wed" as const, label: t("search.dayWed") },
              { key: "thu" as const, label: t("search.dayThu") }, { key: "fri" as const, label: t("search.dayFri") }, { key: "sat" as const, label: t("search.daySat") },
              { key: "sun" as const, label: t("search.daySun") },
            ].map((d) => (
              <button key={d.key} data-testid={`filter-day-${d.key}`} onClick={() => setFilterDays((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                className={`w-7 h-7 rounded-full text-[11px] font-medium transition-colors ${
                  filterDays[d.key] ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{d.label}</button>
            ))}
            <button data-testid="filter-special-needs" onClick={() => setFilterSpecialNeeds(!filterSpecialNeeds)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterSpecialNeeds ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}><Heart className="h-3 w-3 inline mr-0.5" />{t("search.specialNeeds")}</button>
            <button data-testid="filter-school-holidays" onClick={() => setFilterSchoolHolidays(!filterSchoolHolidays)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterSchoolHolidays ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>🏖️ {t("search.schoolHolidays")}</button>
            <button data-testid="filter-cleaning" onClick={() => setFilterCleaning(!filterCleaning)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterCleaning ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}><Home className="h-3 w-3 inline mr-0.5" />{t("search.cleaning")}</button>
          </div>
        </div>
      )}

      {/* Split layout: list left, map right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Nanny List - Left Panel */}
        <div className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 overflow-y-auto border-r border-border bg-card">
          {/* Result count + sort */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {loading ? t("search.searching") : t("search.nanniesFound", { count: sortedProfiles.length })}
            </p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger data-testid="search-sort-select" className="w-40 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">{t("search.sortBestMatch")}</SelectItem>
                <SelectItem value="rating">{t("search.sortHighestRated")}</SelectItem>
                <SelectItem value="distance">{t("search.sortNearestFirst")}</SelectItem>
                <SelectItem value="price_low">{t("search.sortPriceLow")}</SelectItem>
                <SelectItem value="price_high">{t("search.sortPriceHigh")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">{t("search.loading")}</div>
          ) : sortedProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Baby className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm mb-2">{t("search.noResults")}</p>
              {activeFilterCount > 0 && (
                <button data-testid="search-clear-filters-empty" onClick={clearFilters} className="text-primary text-sm hover:underline">{t("search.clearFilters")}</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedProfiles.map((n) => (
                <NannyListItem
                  key={n.nannyProfile.user_id}
                  nanny={n}
                  certs={certs}
                  isHighlighted={hoveredNannyId === n.nannyProfile.user_id}
                  onHover={setHoveredNannyId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Map - Right Panel (hidden on mobile) */}
        <div className="hidden lg:block flex-1">
          <NannyMap
            nannies={sortedProfiles.map((n) => ({
              user_id: n.nannyProfile.user_id,
              full_name: n.profile.full_name,
              latitude: n.nannyProfile.latitude || 0,
              longitude: n.nannyProfile.longitude || 0,
              hourly_rate_recurring: n.nannyProfile.hourly_rate_recurring,
              photo: n.photo,
            }))}
            highlightedId={hoveredNannyId}
            onPinHover={setHoveredNannyId}
          />
        </div>
      </div>
    </div>
  );
};

/** Horizontal nanny card for the list panel — inspired by Babysits layout */
const NannyListItem = ({
  nanny,
  certs,
  isHighlighted,
  onHover,
}: {
  nanny: CombinedNanny;
  certs: (np: NannyProfileResult) => (string | false)[];
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
}) => {
  const { t } = useTranslation();
  const np = nanny.nannyProfile;
  const p = nanny.profile;
  const certList = certs(np).filter(Boolean) as string[];
  const { isFavorite, loading, toggle } = useFavorite(np.user_id);

  const rate = np.babysitting_rate_chf || np.part_time_childcare_rate_chf || np.hourly_rate_spot || np.hourly_rate_recurring;

  const caregiverLabels: Record<string, string> = {
    babysitter: t("search.babysitter"),
    au_pair: t("search.auPair"),
    nanny_assistant: t("search.nannyAssistant"),
    part_time_nanny: t("search.partTimeNanny"),
    full_time_nanny: t("search.fullTimeNanny"),
  };

  return (
    <div
      data-testid={`nanny-card-${np.user_id}`}
      className={`relative flex gap-4 p-4 transition-colors cursor-pointer ${
        isHighlighted ? "bg-primary/5" : "hover:bg-muted/40"
      }`}
      onMouseEnter={() => onHover(np.user_id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Photo */}
      <Link to={`/nanny/${np.user_id}`} data-testid={`nanny-photo-link-${np.user_id}`} className="flex-shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted">
          {nanny.photo ? (
            <img src={nanny.photo} alt={getDisplayName(p, np.nationality)} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Baby className="h-8 w-8" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/nanny/${np.user_id}`} data-testid={`nanny-name-link-${np.user_id}`} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display font-semibold text-foreground text-sm truncate">{getDisplayName(p, np.nationality)}</h3>
            </div>
            {/* Trust Badges */}
            <TrustBadges
              badges={buildBadges({
                emailVerified: true,
                phoneVerified: true,
                identityVerified: true,
                approvedCertificates: nanny.approvedCertificates,
              })}
              size="sm"
            />
            {/* Caregiver types */}
            {(np.caregiver_types || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(np.caregiver_types || []).slice(0, 3).map((ct: string) => (
                  <span key={ct} className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                    {caregiverLabels[ct] || ct}
                  </span>
                ))}
                {np.available_cleaning_only && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                    <Home className="h-3 w-3" /> {t("search.cleaning")}
                  </span>
                )}
              </div>
            )}
            {(p.location || np.nationality) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.location ? t("search.nannyIn", { location: p.location }) : np.nationality}
              </p>
            )}
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <FavoriteButton isFavorite={isFavorite} loading={loading} onClick={(e) => { e?.preventDefault(); toggle(); }} className={`nanny-fav-${np.user_id}`} />
            {rate && (
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                CHF {Number(rate).toFixed(0)}{t("common.perHour")}
              </span>
            )}
          </div>
        </div>

        {/* Rating + key badges row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {nanny.averageRating !== undefined && (nanny.referenceCount || 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              {nanny.averageRating.toFixed(1)}
              <span className="text-muted-foreground">({nanny.referenceCount} {(nanny.referenceCount || 0) > 1 ? t("search.reviews") : t("search.review")})</span>
            </span>
          )}
          {np.has_first_aid && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              <Cross className="h-3 w-3" /> {t("search.firstAidBadge")}
            </span>
          )}
          {np.years_of_experience > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              <Clock className="h-3 w-3" /> {t("search.yrsExp", { count: np.years_of_experience })}
            </span>
          )}
          {/* Response metrics */}
          {np.response_rate !== null && np.response_rate !== undefined && np.avg_response_time_hours !== null && np.avg_response_time_hours !== undefined ? (
            <>
              {np.avg_response_time_hours <= 24 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                  <Zap className="h-3 w-3" /> {np.avg_response_time_hours < 1 ? t("search.repliesWithinLessThan1") : t("search.repliesWithin", { hours: Math.round(np.avg_response_time_hours), count: Math.round(np.avg_response_time_hours) })}
                </span>
              )}
              {np.response_rate >= 50 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                  <MessageCircle className="h-3 w-3" /> {t("search.responseRate", { rate: Math.round(np.response_rate) })}
                </span>
              )}
            </>
          ) : (nanny.referenceCount || 0) === 0 && !nanny.averageRating ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
              {t("search.newOnNannyElite")}
            </span>
          ) : null}
        </div>

        {/* Bio excerpt */}
        {np.bio && (
          <Link to={`/nanny/${np.user_id}`}>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{np.bio}</p>
          </Link>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
          {(p.languages || []).length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> {p.languages!.slice(0, 3).join(", ")}
            </span>
          )}
          {nanny.distance !== undefined && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {nanny.distance} km
              {np.work_radius_km && nanny.distance <= np.work_radius_km && (
                <span className="text-success">• {t("search.inRange")}</span>
              )}
              {np.work_radius_km && nanny.distance > np.work_radius_km && (
                <span className="text-amber-500">• {t("search.extended")}</span>
              )}
            </span>
          )}
          {nanny.matchScore != null && (
            <span className="flex items-center gap-1 font-medium text-primary">
              {t("search.match")} {nanny.matchScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchNannies;
