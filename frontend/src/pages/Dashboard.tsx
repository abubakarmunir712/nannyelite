import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Calendar, Heart, Activity, Search, Clock, MapPin,
  Globe, ChevronRight, Baby, Star, Plus, X, Bell, Briefcase, MessageCircle, Settings, DollarSign, Shield, Eye, Pencil, Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import BookingManagement from "@/components/BookingManagement";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import IdVerification from "@/components/IdVerification";
import VerificationProgress from "@/components/VerificationProgress";
import { Switch } from "@/components/ui/switch";
import MatchingSuggestions from "@/components/MatchingSuggestions";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  languages: string[] | null;
}

interface Booking {
  id: string;
  nanny_user_id: string;
  family_user_id: string;
  status: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  service_type: string | null;
  number_of_children: number;
  total_amount: number | null;
  nanny_name?: string;
  family_name?: string;
}

interface FavoriteNanny {
  id: string;
  nanny_user_id: string;
  nanny_name: string | null;
  nanny_avatar: string | null;
  nanny_photo: string | null;
  nationality: string | null;
  years_of_experience: number;
  hourly_rate_recurring: number | null;
  languages: string[] | null;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  related_user_id: string | null;
  related_user_name?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  date_night: "Date-Night",
  overnight: "Overnight",
  after_school: "After-School",
  weekend_holiday: "Weekend & Holiday",
  full_time: "Full-Time",
  part_time: "Part-Time",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const ACTIVITY_ICONS: Record<string, typeof Calendar> = {
  booking_created: Calendar,
  booking_confirmed: Calendar,
  booking_cancelled: X,
  favorite_added: Heart,
  profile_updated: Activity,
};

const DashboardSkeleton = () => (
  <div className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500">
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:h-10 sm:w-64" />
        <Skeleton className="h-4 w-64 sm:w-80" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full hidden sm:block" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>

    <Skeleton className="h-12 w-full rounded-xl mb-6" />
    <Skeleton className="h-64 w-full rounded-xl" />
  </div>
);

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { hasAdminAccess, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "favorites" | "activity" | "verification" | "children">("bookings");
  const [nannyDocs, setNannyDocs] = useState<any[]>([]);
  const [nannyProfileStatus, setNannyProfileStatus] = useState<string | null>(null);
  const [nannyRejectionReason, setNannyRejectionReason] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<FavoriteNanny[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) { navigate("/login"); return; }

    // IF USER IS ADMIN, REDIRECT TO ADMIN DASHBOARD
    if (hasAdminAccess) {
      console.log("Admin detected, redirecting to /admin");
      navigate("/admin");
      return;
    }

    const loadData = async () => {
      try {
        // Profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url, languages")
          .eq("user_id", user.id)
          .single();

        if (prof) {
          setProfile(prof);
          if (prof.role === "nanny") {
            const { data: np } = await supabase
              .from("nanny_profiles")
              .select("onboarding_completed, job_alerts_enabled, profile_status, rejection_reason")
              .eq("user_id", user.id)
              .single();
            if (!np || !np.onboarding_completed) { navigate("/onboarding/nanny"); return; }
            setJobAlertsEnabled(np.job_alerts_enabled !== false);
            setNannyProfileStatus((np as any).profile_status || "pending");
            setNannyRejectionReason((np as any).rejection_reason || null);
            // Load nanny documents for verification tab
            const { data: docs } = await supabase
              .from("nanny_documents")
              .select("*")
              .eq("user_id", user.id);
            if (docs) setNannyDocs(docs);
          }

          // Fetch location for distance scoring
          if (prof.role === "family") {
            const { data: fp } = await supabase.from("family_profiles").select("latitude, longitude, onboarding_completed").eq("user_id", user.id).single();
            if (!fp || !fp.onboarding_completed) { navigate("/onboarding/family"); return; }
            if (fp?.latitude && fp?.longitude) { setUserLat(Number(fp.latitude)); setUserLng(Number(fp.longitude)); }
            
            // Fetch children
            const { data: kids } = await supabase.from("children").select("*").eq("family_user_id", user.id);
            if (kids) setChildren(kids);
          } else {
            const { data: np2 } = await supabase.from("nanny_profiles").select("latitude, longitude").eq("user_id", user.id).single();
            if (np2?.latitude && np2?.longitude) { setUserLat(Number(np2.latitude)); setUserLng(Number(np2.longitude)); }
          }
        }

        const isFamily = prof?.role === "family";

        // Bookings
        const bookingQuery = supabase
          .from("bookings")
          .select("*")
          .order("booking_date", { ascending: true });

        if (isFamily) {
          bookingQuery.eq("family_user_id", user.id);
        } else {
          bookingQuery.eq("nanny_user_id", user.id);
        }

        const { data: bookingsData } = await bookingQuery;

        if (bookingsData && bookingsData.length > 0) {
          // Fetch related user names
          const relatedIds = bookingsData.map((b) =>
            isFamily ? b.nanny_user_id : b.family_user_id
          );
          const { data: relatedProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", relatedIds);

          const enriched = bookingsData.map((b) => {
            const related = relatedProfiles?.find((p) =>
              p.user_id === (isFamily ? b.nanny_user_id : b.family_user_id)
            );
            return {
              ...b,
              nanny_name: isFamily ? related?.full_name || "Nanny" : undefined,
              family_name: !isFamily ? related?.full_name || "Family" : undefined,
            };
          });
          setBookings(enriched);
        }

        // Favorites (family only)
        if (isFamily) {
          const { data: favs } = await supabase
            .from("favorite_nannies")
            .select("id, nanny_user_id")
            .eq("family_user_id", user.id);

          if (favs && favs.length > 0) {
            const nannyIds = favs.map((f) => f.nanny_user_id);
            const [{ data: nannyProfiles }, { data: nannyDetails }, { data: nannyPhotos }] = await Promise.all([
              supabase.from("profiles").select("user_id, full_name, avatar_url, languages").in("user_id", nannyIds),
              supabase.from("nanny_profiles").select("user_id, nationality, years_of_experience, hourly_rate_recurring").in("user_id", nannyIds),
              supabase.from("nanny_photos").select("user_id, photo_url").eq("is_primary", true).in("user_id", nannyIds),
            ]);

            const enrichedFavs: FavoriteNanny[] = favs.map((f) => {
              const prof = nannyProfiles?.find((p) => p.user_id === f.nanny_user_id);
              const det = nannyDetails?.find((d) => d.user_id === f.nanny_user_id);
              const photo = nannyPhotos?.find((ph) => ph.user_id === f.nanny_user_id);
              return {
                id: f.id,
                nanny_user_id: f.nanny_user_id,
                nanny_name: prof?.full_name || null,
                nanny_avatar: prof?.avatar_url || null,
                nanny_photo: photo?.photo_url || null,
                nationality: det?.nationality || null,
                years_of_experience: det?.years_of_experience || 0,
                hourly_rate_recurring: det?.hourly_rate_recurring || null,
                languages: prof?.languages || null,
              };
            });
            setFavorites(enrichedFavs);
          }
        }

        // Activity
        const { data: acts } = await supabase
          .from("activity_log")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (acts && acts.length > 0) {
          const relatedIds = acts.filter((a) => a.related_user_id).map((a) => a.related_user_id!);
          let nameMap: Record<string, string> = {};
          if (relatedIds.length > 0) {
            const { data: names } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", relatedIds);
            names?.forEach((n) => { nameMap[n.user_id] = n.full_name || "User"; });
          }
          setActivities(acts.map((a) => ({
            ...a,
            related_user_name: a.related_user_id ? nameMap[a.related_user_id] || "User" : undefined,
          })));
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate, hasAdminAccess, authLoading, adminLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const removeFavorite = async (id: string) => {
    await supabase.from("favorite_nannies").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const deleteChild = async (id: string) => {
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setChildren((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Success", description: "Child removed." });
  };

  const upcomingBookings = bookings.filter((b) => !isPast(new Date(b.booking_date)) && b.status !== "cancelled");
  const pastBookings = bookings.filter((b) => isPast(new Date(b.booking_date)) || b.status === "cancelled");

  const isFamily = profile?.role === "family";

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading dashboard...</div>
      </div>
    );
  }

  if (!user || hasAdminAccess) return null;

  const formatBookingDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, MMM d");
  };

  return (
    <div className="min-h-screen bg-secondary">
      <SEO title="Dashboard – NannyElite" description="Manage your NannyElite account, bookings, and profile." path="/dashboard" noindex />
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            <Link to="/messages">
              <Button variant="ghost" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name || user.email}
            </span>
            {profile?.role && (
              <Badge variant="secondary" className="capitalize text-xs">{profile.role}</Badge>
            )}
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {loading && !profile ? (
        <DashboardSkeleton />
      ) : (
        <main className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500">
          {/* Welcome */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isFamily
                  ? "Manage your bookings and find the perfect caregiver"
                  : "View your upcoming jobs and manage your schedule"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/jobs">
                <Button variant="outline" className="rounded-full gap-2">
                  <Briefcase className="h-4 w-4" /> Jobs
                </Button>
              </Link>
              {!isFamily && (
                <>
                  <Link to={`/nanny/${user!.id}`}>
                    <Button variant="outline" className="rounded-full gap-2">
                      <Eye className="h-4 w-4" /> My Profile
                    </Button>
                  </Link>
                  <Link to="/earnings">
                    <Button variant="outline" className="rounded-full gap-2">
                      <DollarSign className="h-4 w-4" /> Earnings
                    </Button>
                  </Link>
                </>
              )}
              {isFamily && (
                <>
                  <Link to={`/family/${user!.id}`}>
                    <Button variant="outline" className="rounded-full gap-2">
                      <Eye className="h-4 w-4" /> My Profile
                    </Button>
                  </Link>
                  <Link to="/search">
                    <Button className="rounded-full gap-2 text-primary-foreground">
                      <Search className="h-4 w-4" /> Find a Nanny
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Profile Status Banner for Nannies */}
          {!isFamily && nannyProfileStatus === "pending" && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Your profile is currently under review</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You can use the platform with no restrictions — browse profiles, send messages, and manage your bookings. The only limitation is that your profile will show as "under approval" to others until verification is completed. An admin may contact you through messages if any clarifications are needed. We aim to complete reviews within 24 hours.
                </p>
              </div>
            </div>
          )}
          {!isFamily && nannyProfileStatus === "approved" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">Profile approved</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">You're visible to families and can apply to jobs.</p>
              </div>
            </div>
          )}
          {!isFamily && nannyProfileStatus === "rejected" && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Profile needs updates</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{nannyRejectionReason || "Please review and update your profile."}</p>
                </div>
              </div>
              <Link to="/onboarding/nanny">
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 shrink-0">
                  Edit Profile
                </Button>
              </Link>
            </div>
          )}


          {!isFamily && (
            <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Job Alert Notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified when families post new jobs</p>
                </div>
              </div>
              <Switch
                checked={jobAlertsEnabled}
                onCheckedChange={async (checked) => {
                  setJobAlertsEnabled(checked);
                  await supabase
                    .from("nanny_profiles")
                    .update({ job_alerts_enabled: checked } as any)
                    .eq("user_id", user!.id);
                }}
              />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Upcoming</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-8 mt-1" /> : upcomingBookings.length}
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Completed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-8 mt-1" /> : bookings.filter((b) => b.status === "completed").length}
              </p>
            </div>
            {isFamily && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs">Favorites</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <Skeleton className="h-8 w-8 mt-1" /> : favorites.length}
                </p>
              </div>
            )}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Activity</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-8 mt-1" /> : activities.length}
              </p>
            </div>
          </div>

          {/* Nanny Verification Progress */}
          {!isFamily && (
            <div className="mb-6">
              <VerificationProgress />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
            {[
              { key: "bookings" as const, label: "Bookings", icon: Calendar },
              ...(isFamily ? [
                { key: "favorites" as const, label: "Favorites", icon: Heart },
                { key: "children" as const, label: "Children", icon: Baby }
              ] : []),
              ...(!isFamily ? [{ key: "verification" as const, label: "Verification", icon: Shield }] : []),
              { key: "activity" as const, label: "Activity", icon: Bell },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "bookings" && (
            <BookingManagement
              bookings={bookings}
              isFamily={isFamily}
              loading={loading && bookings.length === 0}
              onUpdate={(id, status) => {
                setBookings((prev) =>
                  prev.map((b) => (b.id === id ? { ...b, status } : b))
                );
              }}
            />
          )}

          {/* ── Favorites Tab ── */}
          {activeTab === "favorites" && isFamily && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" /> Favorite Nannies
              </h2>
              {loading && favorites.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : favorites.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-8 text-center">
                  <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">No favorite nannies yet</p>
                  <Link to="/search">
                    <Button variant="outline" className="rounded-full gap-2">
                      <Search className="h-4 w-4" /> Browse Nannies
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="bg-card rounded-xl border border-border overflow-hidden flex">
                      <Link to={`/nanny/${fav.nanny_user_id}`} className="flex flex-1 items-center gap-4 p-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          {(fav.nanny_photo || fav.nanny_avatar) ? (
                            <img src={fav.nanny_photo || fav.nanny_avatar!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Baby className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground text-sm truncate">{fav.nanny_name || "Nanny"}</h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            {fav.nationality && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{fav.nationality}</span>}
                            {fav.years_of_experience > 0 && <span>{fav.years_of_experience}y exp</span>}
                          </div>
                          {fav.hourly_rate_recurring && (
                            <span className="text-xs font-medium text-foreground mt-1 block">CHF {Number(fav.hourly_rate_recurring).toFixed(0)}/hr</span>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFavorite(fav.id)}
                        className="px-3 flex items-center text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove from favorites"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Children Tab ── */}
          {activeTab === "children" && isFamily && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Baby className="h-5 w-5 text-primary" /> My Children
                </h2>
                <Link to="/edit-family-profile">
                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                    <Pencil className="h-4 w-4" /> Manage Profile
                  </Button>
                </Link>
              </div>
              
              {loading && children.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : children.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-8 text-center">
                  <Baby className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">No child information added yet</p>
                  <Link to="/edit-family-profile">
                    <Button className="rounded-full gap-2">
                      <Plus className="h-4 w-4" /> Add Child
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {children.map((child) => (
                    <div key={child.id} className="bg-card rounded-xl border border-border p-4 flex justify-between items-start group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Baby className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{child.name || "Child"}</h3>
                          <p className="text-xs text-muted-foreground">Born in {child.birth_year} ({new Date().getFullYear() - child.birth_year}y)</p>
                          {child.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">"{child.notes}"</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link to="/edit-family-profile">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full flex items-center justify-center">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <button 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full flex items-center justify-center transition-colors"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to remove this child?")) {
                              deleteChild(child.id);
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Link 
                    to="/edit-family-profile" 
                    className="bg-card rounded-xl border border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors group min-h-[88px]"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Add Child</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── Activity Tab ── */}
          {activeTab === "activity" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Recent Activity
              </h2>
              {loading && activities.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : activities.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No activity yet. Start by browsing nannies or creating a booking!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.activity_type] || Activity;
                    return (
                      <div key={a.id} className="bg-card rounded-lg border border-border p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                          )}
                          {a.related_user_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.activity_type.includes("favorite") ? "♡" : "👤"} {a.related_user_name}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Verification Tab (Nanny) ── */}
          {activeTab === "verification" && !isFamily && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Trust & Verification
              </h2>
              <VerificationProgress />
            </div>
          )}

          {/* Matching Suggestions */}
          <div className="mt-8">
            <MatchingSuggestions
              viewerRole={isFamily ? "family" : "nanny"}
              viewerLanguages={profile?.languages || []}
              viewerLat={userLat}
              viewerLng={userLng}
            />
          </div>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
