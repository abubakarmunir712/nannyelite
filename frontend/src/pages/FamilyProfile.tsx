import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Home, Baby, Globe, MapPin, Heart, Shield } from "lucide-react";
import SEO from "@/components/SEO";

const FamilyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminRole();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [
          { data: p },
          { data: fp },
          { data: c },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("family_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("children").select("*").eq("family_user_id", id),
        ]);

        setProfile(p);
        setFamilyProfile(fp);
        setChildren(c || []);
      } catch (err) {
        console.error("Error fetching family profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profile || !familyProfile) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Profile not found.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="rounded-full"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === id || hasAdminAccess;
  const firstName = profile.full_name?.split(" ")[0] || "Family";

  return (
    <div className="min-h-screen bg-secondary pb-12">
      <SEO title={`${profile.full_name || "Family"} Profile – NannyElite`} description="View family profile and household details." path={`/family/${id}`} noindex />
      
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-bold text-primary">Family Profile</h1>
          </div>
          {isOwner && (
            <Link to="/edit-family-profile">
              <Button size="sm" variant="outline" className="rounded-full gap-2">
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Info */}
        <div className="bg-card rounded-2xl border border-border p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border-4 border-card shadow-sm">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Home className="h-10 w-10 text-primary" />
            )}
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{profile.full_name}</h2>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4" />
              {familyProfile.city}, {familyProfile.country}
            </div>
            {profile.languages && profile.languages.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Globe className="h-4 w-4" />
                {profile.languages.join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Household Section */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-bold text-foreground">Our Household</h3>
          </div>
          
          {familyProfile.household_description && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About Us</h4>
              <p className="text-foreground leading-relaxed">{familyProfile.household_description}</p>
            </div>
          )}

          {familyProfile.pets_description && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pets</h4>
              <p className="text-foreground leading-relaxed">{familyProfile.pets_description}</p>
            </div>
          )}

          {familyProfile.special_requirements && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Requirements</h4>
              <p className="text-foreground leading-relaxed">{familyProfile.special_requirements}</p>
            </div>
          )}
        </div>

        {/* Children Section */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-bold text-foreground">Our Children</h3>
          </div>

          {children.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 italic">No child information provided.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children.map((child, idx) => (
                <div key={child.id || idx} className="bg-muted/30 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Baby className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{child.name || `Child ${idx + 1}`}</h4>
                      <p className="text-xs text-muted-foreground">Born in {child.birth_year} ({new Date().getFullYear() - child.birth_year}y)</p>
                    </div>
                  </div>
                  {child.gender !== "not_specified" && (
                    <p className="text-xs text-muted-foreground mb-1 capitalize">Gender: {child.gender}</p>
                  )}
                  {child.notes && (
                    <p className="text-xs text-foreground mt-2 bg-card p-2 rounded border border-border/50">
                      {child.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety/Trust Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-semibold text-sm">Security & Privacy</p>
            <p>Household details and child information are only shared with caregivers you interact with. We recommend keeping sensitive details private until you've established trust.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FamilyProfile;
