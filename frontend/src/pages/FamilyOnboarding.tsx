import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Baby, Home, ChevronRight, ChevronLeft, Plus, Trash2, Check, Eye } from "lucide-react";
import LocationStep, { type LocationStepData } from "@/components/onboarding/LocationStep";
import ProfileVisibilitySelector from "@/components/ProfileVisibilitySelector";

interface Child {
  id?: string;
  name: string;
  birth_year: number;
  gender: string;
  notes: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 19 }, (_, i) => currentYear - i);

const FamilyOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Location
  const [locationData, setLocationData] = useState<LocationStepData>({
    city: "", postalCode: "", state: "", country: "Switzerland", latitude: null, longitude: null,
  });
  const [address, setAddress] = useState("");

  // Step 2: Household
  const [householdDescription, setHouseholdDescription] = useState("");
  const [petsDescription, setPetsDescription] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");

  // Step 3: Children
  const [children, setChildren] = useState<Child[]>([
    { name: "", birth_year: currentYear - 3, gender: "not_specified", notes: "" },
  ]);

  // Step 4: Profile Visibility
  const [profileVisibility, setProfileVisibility] = useState("public");

  // ─── LocalStorage Progress Saving ───
  const STORAGE_KEY = "family_onboarding_progress";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.step) setStep(d.step);
        if (d.locationData) setLocationData(d.locationData);
        if (d.address) setAddress(d.address);
        if (d.householdDescription) setHouseholdDescription(d.householdDescription);
        if (d.petsDescription) setPetsDescription(d.petsDescription);
        if (d.specialRequirements) setSpecialRequirements(d.specialRequirements);
        if (d.children) setChildren(d.children);
        if (d.profileVisibility) setProfileVisibility(d.profileVisibility);
      } catch { /* ignore corrupt data */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, locationData, address, householdDescription, petsDescription, specialRequirements, children, profileVisibility,
    }));
  }, [step, locationData, address, householdDescription, petsDescription, specialRequirements, children, profileVisibility]);

  const addChild = () => setChildren(prev => [...prev, { name: "", birth_year: currentYear - 3, gender: "not_specified", notes: "" }]);
  const removeChild = (idx: number) => setChildren(prev => prev.filter((_, i) => i !== idx));
  const updateChild = (idx: number, field: keyof Child, value: string | number) => {
    setChildren(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

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
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Save profile visibility
      await supabase.from("profiles").update({
        profile_visibility: profileVisibility,
      } as any).eq("user_id", user.id);

      for (const child of children) {
        if (!child.birth_year) continue;
        await supabase.from("children").insert({
          family_user_id: user.id,
          name: child.name || null,
          birth_year: child.birth_year,
          gender: child.gender,
          notes: child.notes || null,
        });
      }

      toast({ title: "Welcome!", description: "Your family profile is set up." });
      localStorage.removeItem(STORAGE_KEY);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Family Profile Setup</h1>
          <p className="text-muted-foreground mt-2">Tell us about your household so we can find the best match</p>
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${
                i + 1 <= step ? "bg-primary w-10" : "bg-muted w-6"
              }`} />
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">Your Location</h2>
              </div>

              <LocationStep value={locationData} onChange={setLocationData} />

              <div className="space-y-2">
                <Label>Street Address (optional, kept private)</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
              </div>
            </div>
          )}

          {/* Step 2: Household */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">Your Household</h2>
              </div>
              <div className="space-y-2">
                <Label>Describe your household</Label>
                <Textarea
                  value={householdDescription}
                  onChange={e => setHouseholdDescription(e.target.value)}
                  placeholder="e.g. We live in a 3-bedroom apartment. Both parents work full-time..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Pets</Label>
                <Input
                  value={petsDescription}
                  onChange={e => setPetsDescription(e.target.value)}
                  placeholder="e.g. 1 dog (friendly golden retriever)"
                />
              </div>
              <div className="space-y-2">
                <Label>Special requirements or preferences</Label>
                <Textarea
                  value={specialRequirements}
                  onChange={e => setSpecialRequirements(e.target.value)}
                  placeholder="e.g. We need someone who speaks German, vegetarian cooking..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Children */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Baby className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-semibold text-foreground">Your Children</h2>
                </div>
                <Button variant="outline" size="sm" onClick={addChild} className="gap-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {children.map((child, idx) => (
                <div key={idx} className="bg-muted/50 rounded-xl p-4 space-y-3 relative">
                  {children.length > 1 && (
                    <button onClick={() => removeChild(idx)} className="absolute top-3 right-3 text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="text-xs font-medium text-muted-foreground">Child {idx + 1}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name (optional)</Label>
                      <Input value={child.name} onChange={e => updateChild(idx, "name", e.target.value)} placeholder="Name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Birth Year</Label>
                      <Select value={String(child.birth_year)} onValueChange={v => updateChild(idx, "birth_year", parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {years.map(y => <SelectItem key={y} value={String(y)}>{y} ({currentYear - y}y)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
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
                  <div className="space-y-1">
                    <Label className="text-xs">Notes (allergies, special needs, etc.)</Label>
                    <Input value={child.notes} onChange={e => updateChild(idx, "notes", e.target.value)} placeholder="Any notes..." />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Profile Visibility */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">Profile Visibility</h2>
              </div>
              <ProfileVisibilitySelector value={profileVisibility} onChange={setProfileVisibility} />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            ) : <div />}
            {step < totalSteps ? (
              <Button onClick={() => {
                if (step === 1 && (!locationData.city || !locationData.latitude)) {
                  toast({ title: "Location required", description: "Please select your location using search, GPS, or the map.", variant: "destructive" });
                  return;
                }
                setStep(s => s + 1);
              }} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading} className="gap-1">
                {loading ? "Saving..." : <><Check className="h-4 w-4" /> Complete Setup</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyOnboarding;
