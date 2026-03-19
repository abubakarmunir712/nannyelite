import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Home, Save, MapPin, Eye, Shield, Baby, Plus, Trash2 } from "lucide-react";
import LocationStep, { type LocationStepData } from "@/components/onboarding/LocationStep";
import ProfileVisibilitySelector from "@/components/ProfileVisibilitySelector";
import SEO from "@/components/SEO";

interface Child {
  id?: string;
  name: string;
  birth_year: number;
  gender: string;
  notes: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 19 }, (_, i) => currentYear - i);

const EditFamilyProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [locationData, setLocationData] = useState<LocationStepData>({
    city: "", postalCode: "", state: "", country: "Switzerland", latitude: null, longitude: null,
  });
  const [address, setAddress] = useState("");
  const [householdDescription, setHouseholdDescription] = useState("");
  const [petsDescription, setPetsDescription] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [
          { data: fp },
          { data: prof },
          { data: kids }
        ] = await Promise.all([
          supabase.from("family_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("profiles").select("profile_visibility").eq("user_id", user.id).maybeSingle(),
          supabase.from("children").select("*").eq("family_user_id", user.id)
        ]);

        if (fp) {
          setLocationData({
            city: fp.city || "",
            postalCode: fp.postal_code || "",
            state: fp.state || "",
            country: fp.country || "Switzerland",
            latitude: fp.latitude,
            longitude: fp.longitude,
          });
          setAddress(fp.address || "");
          setHouseholdDescription(fp.household_description || "");
          setPetsDescription(fp.pets_description || "");
          setSpecialRequirements(fp.special_requirements || "");
        }

        if (prof?.profile_visibility) setProfileVisibility(prof.profile_visibility);
        
        if (kids) {
          setChildren(kids.map(k => ({
            id: k.id,
            name: k.name || "",
            birth_year: k.birth_year,
            gender: k.gender,
            notes: k.notes || "",
          })));
        }
      } catch (err) {
        console.error("Error fetching family profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, navigate]);

  const addChild = () => setChildren(prev => [...prev, { name: "", birth_year: currentYear - 3, gender: "not_specified", notes: "" }]);
  const removeChild = (idx: number) => setChildren(prev => prev.filter((_, i) => i !== idx));
  const updateChild = (idx: number, field: keyof Child, value: string | number) => {
    setChildren(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("family_profiles")
        .upsert({
          user_id: user.id,
          address,
          city: locationData.city,
          state: locationData.state,
          postal_code: locationData.postalCode,
          country: locationData.country,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          household_description: householdDescription,
          pets_description: petsDescription,
          special_requirements: specialRequirements,
          onboarding_completed: true,
          profile_visible: true,
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Save profile visibility
      await supabase.from("profiles").update({
        profile_visibility: profileVisibility,
      } as any).eq("user_id", user.id);

      // Handle children: Delete and re-insert (simplest way to sync)
      await supabase.from("children").delete().eq("family_user_id", user.id);
      
      const childrenToInsert = children.filter(c => c.birth_year).map(c => ({
        family_user_id: user.id,
        name: c.name || null,
        birth_year: c.birth_year,
        gender: c.gender,
        notes: c.notes || null,
      }));

      if (childrenToInsert.length > 0) {
        const { error: childError } = await supabase.from("children").insert(childrenToInsert);
        if (childError) throw childError;
      }

      toast({ title: "Success", description: "Your profile has been updated." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary pb-12">
      <SEO title="Edit Family Profile – NannyElite" noindex />
      
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-bold text-primary">Edit Profile</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2">
            {saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Section 1: Location */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Location</h2>
          </div>
          
          <LocationStep value={locationData} onChange={setLocationData} />

          <div className="space-y-2">
            <Label htmlFor="address">Street Address (kept private)</Label>
            <Input 
              id="address"
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              placeholder="e.g. Rue du Rhône 12" 
            />
          </div>
        </div>

        {/* Section 2: Household */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Household Details</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="household">About your household</Label>
            <Textarea
              id="household"
              value={householdDescription}
              onChange={e => setHouseholdDescription(e.target.value)}
              placeholder="e.g. We live in a 3-bedroom apartment. Both parents work full-time..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pets">Pets</Label>
            <Input
              id="pets"
              value={petsDescription}
              onChange={e => setPetsDescription(e.target.value)}
              placeholder="e.g. 1 dog (friendly golden retriever)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special">Special requirements or preferences</Label>
            <Textarea
              id="special"
              value={specialRequirements}
              onChange={e => setSpecialRequirements(e.target.value)}
              placeholder="e.g. We need someone who speaks German, vegetarian cooking..."
              rows={3}
            />
          </div>
        </div>

        {/* Section 3: Children */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Children</h2>
            </div>
            <Button variant="outline" size="sm" onClick={addChild} className="rounded-full gap-1">
              <Plus className="h-3 w-3" /> Add Child
            </Button>
          </div>

          <div className="space-y-6">
            {children.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border">
                No children added yet.
              </p>
            ) : (
              children.map((child, idx) => (
                <div key={idx} className="bg-muted/30 rounded-2xl p-6 space-y-4 relative border border-border/50">
                  <button 
                    onClick={() => removeChild(idx)} 
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Name (optional)</Label>
                      <Input 
                        value={child.name} 
                        onChange={e => updateChild(idx, "name", e.target.value)} 
                        placeholder="Name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Birth Year</Label>
                      <Select 
                        value={String(child.birth_year)} 
                        onValueChange={v => updateChild(idx, "birth_year", parseInt(v))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {years.map(y => (
                            <SelectItem key={y} value={String(y)}>
                              {y} ({currentYear - y}y)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Gender</Label>
                    <Select value={child.gender} onValueChange={v => updateChild(idx, "gender", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">Prefer not to say</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Notes (allergies, special needs, etc.)</Label>
                    <Input 
                      value={child.notes} 
                      onChange={e => updateChild(idx, "notes", e.target.value)} 
                      placeholder="Any notes..." 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 4: Visibility */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Privacy & Visibility</h2>
          </div>
          
          <ProfileVisibilitySelector value={profileVisibility} onChange={setProfileVisibility} />
          
          <div className="bg-muted/50 rounded-xl p-4 flex gap-3">
            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your street address is never shown publicly. Only your city and general area are used to help caregivers find you.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto px-8 rounded-full gap-2">
            {saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Profile</>}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditFamilyProfile;
