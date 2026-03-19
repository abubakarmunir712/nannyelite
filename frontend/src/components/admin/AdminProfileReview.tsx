import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, CheckCircle, XCircle, MapPin, Clock, Award, Shield,
  Phone, Mail, Camera, FileText, User, Briefcase, Languages, Heart,
  Pencil, Save, X,
} from "lucide-react";

interface AdminProfileReviewProps {
  nannyUserId: string;
  onBack: () => void;
}

const CHECKLIST_ITEMS = [
  { key: "photo", label: "Profile photo uploaded (not stock photo)", icon: Camera },
  { key: "bio", label: "Bio is complete and professional", icon: FileText },
  { key: "experience", label: "Experience details provided", icon: Briefcase },
  { key: "not_fake", label: "Profile is not fake or spam", icon: Shield },
  { key: "info_complete", label: "Profile information is complete", icon: User },
  { key: "references", label: "Reference contacts provided", icon: Heart },
  { key: "phone", label: "Phone verified", icon: Phone },
  { key: "email", label: "Email verified", icon: Mail },
];

// Reusable section header with edit toggle
const SectionHeader = ({ title, editing, onToggle }: { title: string; editing: boolean; onToggle: () => void }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-display font-semibold text-foreground">{title}</h3>
    <Button variant="ghost" size="sm" onClick={onToggle} className="gap-1 text-xs h-7">
      {editing ? <><X className="h-3 w-3" /> Cancel</> : <><Pencil className="h-3 w-3" /> Edit</>}
    </Button>
  </div>
);

const AdminProfileReview = ({ nannyUserId, onBack }: AdminProfileReviewProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [nannyProfile, setNannyProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [references, setReferences] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inline edit states
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [editingExperience, setEditingExperience] = useState(false);

  // Edit form values
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNationality, setEditNationality] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAiDesc, setEditAiDesc] = useState("");
  const [editSpotRate, setEditSpotRate] = useState("");
  const [editRecurringRate, setEditRecurringRate] = useState("");
  const [editBabysittingRate, setEditBabysittingRate] = useState("");
  const [editPartTimeRate, setEditPartTimeRate] = useState("");
  const [editYearsExp, setEditYearsExp] = useState("");
  const [editExpInfants, setEditExpInfants] = useState(false);
  const [editExpToddlers, setEditExpToddlers] = useState(false);
  const [editExpPreschool, setEditExpPreschool] = useState(false);
  const [editExpSchoolAge, setEditExpSchoolAge] = useState(false);
  const [editExpTeenagers, setEditExpTeenagers] = useState(false);
  const [editExpSpecialNeeds, setEditExpSpecialNeeds] = useState(false);

  const fetchData = async () => {
    const [
      { data: prof },
      { data: np },
      { data: ph },
      { data: docs },
      { data: refs },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", nannyUserId).single(),
      supabase.from("nanny_profiles").select("*").eq("user_id", nannyUserId).single(),
      supabase.from("nanny_photos").select("*").eq("user_id", nannyUserId).order("display_order"),
      supabase.from("nanny_documents").select("*").eq("user_id", nannyUserId).order("created_at"),
      supabase.from("nanny_references").select("*").eq("nanny_user_id", nannyUserId),
    ]);
    setProfile(prof);
    setNannyProfile(np);
    setPhotos(ph || []);
    setDocuments(docs || []);
    setReferences(refs || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [nannyUserId]);

  // Populate edit forms when toggling edit mode
  const startEditBasic = () => {
    setEditName(profile?.full_name || "");
    setEditPhone(profile?.phone || "");
    setEditLocation(profile?.location || "");
    setEditNationality(nannyProfile?.nationality || "");
    setEditingBasic(true);
  };

  const startEditBio = () => {
    setEditBio(nannyProfile?.bio || "");
    setEditAiDesc(nannyProfile?.ai_generated_description || "");
    setEditingBio(true);
  };

  const startEditRates = () => {
    setEditSpotRate(nannyProfile?.hourly_rate_spot?.toString() || "");
    setEditRecurringRate(nannyProfile?.hourly_rate_recurring?.toString() || "");
    setEditBabysittingRate(nannyProfile?.babysitting_rate_chf?.toString() || "");
    setEditPartTimeRate(nannyProfile?.part_time_childcare_rate_chf?.toString() || "");
    setEditingRates(true);
  };

  const startEditExperience = () => {
    setEditYearsExp(nannyProfile?.years_of_experience?.toString() || "0");
    setEditExpInfants(!!nannyProfile?.experience_infants);
    setEditExpToddlers(!!nannyProfile?.experience_toddlers);
    setEditExpPreschool(!!nannyProfile?.experience_preschool);
    setEditExpSchoolAge(!!nannyProfile?.experience_school_age);
    setEditExpTeenagers(!!nannyProfile?.experience_teenagers);
    setEditExpSpecialNeeds(!!nannyProfile?.experience_special_needs);
    setEditingExperience(true);
  };

  const saveBasic = async () => {
    setSaving(true);
    const [r1, r2] = await Promise.all([
      supabase.from("profiles").update({
        full_name: editName.trim() || null,
        phone: editPhone.trim() || null,
        location: editLocation.trim() || null,
      }).eq("user_id", nannyUserId),
      supabase.from("nanny_profiles").update({
        nationality: editNationality.trim() || null,
      }).eq("user_id", nannyUserId),
    ]);
    setSaving(false);
    if (r1.error || r2.error) {
      toast({ title: "Error", description: (r1.error || r2.error)?.message, variant: "destructive" });
    } else {
      toast({ title: "Basic info updated" });
      setEditingBasic(false);
      fetchData();
    }
  };

  const saveBio = async () => {
    setSaving(true);
    const { error } = await supabase.from("nanny_profiles").update({
      bio: editBio.trim() || null,
      ai_generated_description: editAiDesc.trim() || null,
    }).eq("user_id", nannyUserId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bio updated" });
      setEditingBio(false);
      fetchData();
    }
  };

  const saveRates = async () => {
    setSaving(true);
    const { error } = await supabase.from("nanny_profiles").update({
      hourly_rate_spot: editSpotRate ? parseFloat(editSpotRate) : null,
      hourly_rate_recurring: editRecurringRate ? parseFloat(editRecurringRate) : null,
      babysitting_rate_chf: editBabysittingRate ? parseFloat(editBabysittingRate) : null,
      part_time_childcare_rate_chf: editPartTimeRate ? parseFloat(editPartTimeRate) : null,
    }).eq("user_id", nannyUserId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rates updated" });
      setEditingRates(false);
      fetchData();
    }
  };

  const saveExperience = async () => {
    setSaving(true);
    const { error } = await supabase.from("nanny_profiles").update({
      years_of_experience: parseInt(editYearsExp) || 0,
      experience_infants: editExpInfants,
      experience_toddlers: editExpToddlers,
      experience_preschool: editExpPreschool,
      experience_school_age: editExpSchoolAge,
      experience_teenagers: editExpTeenagers,
      experience_special_needs: editExpSpecialNeeds,
    }).eq("user_id", nannyUserId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Experience updated" });
      setEditingExperience(false);
      fetchData();
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("nanny_profiles")
      .update({
        profile_status: "approved",
        profile_visible: true,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("user_id", nannyUserId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile approved", description: "The nanny profile is now visible to families." });
      onBack();
    }
    setSaving(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("nanny_profiles")
      .update({
        profile_status: "rejected",
        profile_visible: false,
        rejection_reason: rejectionReason.trim(),
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("user_id", nannyUserId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile rejected", description: "The nanny has been notified." });
      setRejectOpen(false);
      onBack();
    }
    setSaving(false);
  };

  const handleManualVerify = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("nanny_profiles")
      .update({
        manual_identity_verified: true,
        identity_verified_at: new Date().toISOString(),
      } as any)
      .eq("user_id", nannyUserId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Identity manually verified", description: "The Identity Verified badge will now appear on this profile." });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground p-8">Loading profile...</p>;
  if (!nannyProfile || !profile) return <p className="text-destructive p-8">Profile not found.</p>;

  const primaryPhoto = photos.find((p) => p.is_primary)?.photo_url || profile.avatar_url;

  const days = [
    { key: "monday", label: "Mon" }, { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" }, { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" }, { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

  const certs = [
    nannyProfile.has_first_aid && "First Aid",
    nannyProfile.has_cpr && "CPR",
    nannyProfile.has_early_childhood_cert && "Early Childhood",
    nannyProfile.has_child_psychology && "Child Psychology",
    nannyProfile.has_montessori_cert && "Montessori",
    nannyProfile.has_nutrition_cert && "Nutrition",
  ].filter(Boolean);

  const ageGroups = [
    nannyProfile.experience_infants && "Infants",
    nannyProfile.experience_toddlers && "Toddlers",
    nannyProfile.experience_preschool && "Preschool",
    nannyProfile.experience_school_age && "School Age",
    nannyProfile.experience_teenagers && "Teenagers",
    nannyProfile.experience_special_needs && "Special Needs",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Profiles
        </Button>
        <Badge
          variant={nannyProfile.profile_status === "approved" ? "default" : nannyProfile.profile_status === "rejected" ? "destructive" : "secondary"}
          className="text-sm"
        >
          {nannyProfile.profile_status === "pending" ? "⏳ Pending Review" : nannyProfile.profile_status === "approved" ? "✅ Approved" : "❌ Rejected"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Profile Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <SectionHeader title="Basic Info" editing={editingBasic} onToggle={() => editingBasic ? setEditingBasic(false) : startEditBasic()} />

            {editingBasic ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Nationality</Label>
                    <Input value={editNationality} onChange={(e) => setEditNationality(e.target.value)} />
                  </div>
                </div>
                <Button size="sm" onClick={saveBasic} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 mb-4">
                  {primaryPhoto ? (
                    <img src={primaryPhoto} alt="Profile" className="w-20 h-20 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">{profile.full_name || "Unknown"}</h2>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
                    {profile.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {profile.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="font-semibold text-foreground">{nannyProfile.years_of_experience || 0} yrs</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Spot Rate</p>
                    <p className="font-semibold text-foreground">{nannyProfile.hourly_rate_spot ? `CHF ${nannyProfile.hourly_rate_spot}` : "—"}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="font-semibold text-foreground">{nannyProfile.nationality || "—"}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-semibold text-foreground">{new Date(nannyProfile.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bio & AI Description */}
          <div className="bg-card rounded-xl border border-border p-6">
            <SectionHeader title="Bio & Description" editing={editingBio} onToggle={() => editingBio ? setEditingBio(false) : startEditBio()} />

            {editingBio ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Manual Bio</Label>
                  <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} maxLength={2000} />
                </div>
                <div>
                  <Label className="text-xs">AI-Generated Description</Label>
                  <Textarea value={editAiDesc} onChange={(e) => setEditAiDesc(e.target.value)} rows={4} maxLength={3000} />
                </div>
                <Button size="sm" onClick={saveBio} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {nannyProfile.bio ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Manual Bio</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{nannyProfile.bio}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No manual bio provided</p>
                )}
                {nannyProfile.ai_generated_description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AI-Generated</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{nannyProfile.ai_generated_description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rates */}
          <div className="bg-card rounded-xl border border-border p-6">
            <SectionHeader title="Rates" editing={editingRates} onToggle={() => editingRates ? setEditingRates(false) : startEditRates()} />

            {editingRates ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Spot Rate (CHF/hr)</Label>
                    <Input type="number" min="0" step="0.5" value={editSpotRate} onChange={(e) => setEditSpotRate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Recurring Rate (CHF/hr)</Label>
                    <Input type="number" min="0" step="0.5" value={editRecurringRate} onChange={(e) => setEditRecurringRate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Babysitting Rate (CHF/hr)</Label>
                    <Input type="number" min="0" step="0.5" value={editBabysittingRate} onChange={(e) => setEditBabysittingRate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Part-Time Rate (CHF/hr)</Label>
                    <Input type="number" min="0" step="0.5" value={editPartTimeRate} onChange={(e) => setEditPartTimeRate(e.target.value)} />
                  </div>
                </div>
                <Button size="sm" onClick={saveRates} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Spot</p>
                  <p className="font-semibold text-foreground">{nannyProfile.hourly_rate_spot ? `CHF ${nannyProfile.hourly_rate_spot}` : "—"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Recurring</p>
                  <p className="font-semibold text-foreground">{nannyProfile.hourly_rate_recurring ? `CHF ${nannyProfile.hourly_rate_recurring}` : "—"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Babysitting</p>
                  <p className="font-semibold text-foreground">{nannyProfile.babysitting_rate_chf ? `CHF ${nannyProfile.babysitting_rate_chf}` : "—"}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Part-Time</p>
                  <p className="font-semibold text-foreground">{nannyProfile.part_time_childcare_rate_chf ? `CHF ${nannyProfile.part_time_childcare_rate_chf}` : "—"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Experience & Qualifications */}
          <div className="bg-card rounded-xl border border-border p-6">
            <SectionHeader title="Experience & Qualifications" editing={editingExperience} onToggle={() => editingExperience ? setEditingExperience(false) : startEditExperience()} />

            {editingExperience ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Years of Experience</Label>
                  <Input type="number" min="0" max="50" value={editYearsExp} onChange={(e) => setEditYearsExp(e.target.value)} className="w-24" />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Age Groups</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: "Infants", val: editExpInfants, set: setEditExpInfants },
                      { key: "Toddlers", val: editExpToddlers, set: setEditExpToddlers },
                      { key: "Preschool", val: editExpPreschool, set: setEditExpPreschool },
                      { key: "School Age", val: editExpSchoolAge, set: setEditExpSchoolAge },
                      { key: "Teenagers", val: editExpTeenagers, set: setEditExpTeenagers },
                      { key: "Special Needs", val: editExpSpecialNeeds, set: setEditExpSpecialNeeds },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={item.val} onCheckedChange={(v) => item.set(!!v)} />
                        <span className="text-sm">{item.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={saveExperience} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {ageGroups.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Age Groups</p>
                    <div className="flex flex-wrap gap-1">
                      {ageGroups.map((g) => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}
                    </div>
                  </div>
                )}
                {certs.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                    <div className="flex flex-wrap gap-1">
                      {certs.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {profile.languages?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Languages</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.languages.map((l: string) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Availability (read-only) */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold text-foreground mb-3">Availability</h3>
            <div className="flex gap-2 flex-wrap">
              {days.map((d) => (
                <div
                  key={d.key}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    nannyProfile[`available_${d.key}`]
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d.label}
                </div>
              ))}
            </div>
            {nannyProfile.availability_notes && (
              <p className="text-sm text-muted-foreground mt-2">{nannyProfile.availability_notes}</p>
            )}
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Photos ({photos.length})</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p) => (
                  <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={p.photo_url} alt="Nanny photo" className="w-full aspect-square rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">Documents ({documents.length})</h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.document_name || doc.document_type}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.document_type} · {doc.status}</p>
                      </div>
                    </div>
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">View</Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {references.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display font-semibold text-foreground mb-3">References ({references.length})</h3>
              <div className="space-y-3">
                {references.map((ref) => (
                  <div key={ref.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{ref.title}</p>
                      <Badge variant="outline" className="text-xs">⭐ {ref.rating}/5</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ref.content}</p>
                    {ref.relationship && <p className="text-xs text-muted-foreground mt-1">Relationship: {ref.relationship}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Verification Checklist */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 sticky top-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Verification Checklist
            </h3>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    checked={!!checklist[item.key]}
                    onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [item.key]: !!v }))}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              {Object.values(checklist).filter(Boolean).length} / {CHECKLIST_ITEMS.length} verified
            </div>

            {/* View Public Profile */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full gap-2 mb-2"
                onClick={() => window.open(`/nanny/${nannyUserId}`, "_blank")}
              >
                <Briefcase className="h-4 w-4" /> View Public Profile
              </Button>
            </div>

            {nannyProfile.profile_status === "pending" && (
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  onClick={handleApprove}
                  disabled={saving}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saving ? "Saving..." : "Approve Profile"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Profile
                </Button>
              </div>
            )}

            {/* Manual Identity Verification */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Identity Verification
              </h4>
              {nannyProfile.identity_verified || nannyProfile.manual_identity_verified ? (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {nannyProfile.identity_verified ? "DIDIT Verified" : "Manually Verified"}
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualVerify}
                  disabled={saving}
                  className="w-full gap-1.5 text-xs"
                  data-testid="manual-verify-identity-btn"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {saving ? "Verifying..." : "Manually Verify Identity"}
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Use this when DIDIT verification fails or for manual call verification.
              </p>
            </div>

            {nannyProfile.profile_status === "rejected" && nannyProfile.rejection_reason && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs font-medium text-destructive mb-1">Rejection Reason:</p>
                <p className="text-sm text-destructive/80">{nannyProfile.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Reject Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. The nanny will be able to update their profile and resubmit.
            </p>
            <Textarea
              placeholder="Reason for rejection (e.g., 'ID document is blurry, please re-upload a clear photo')..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={saving} className="flex-1 gap-2">
                <XCircle className="h-4 w-4" />
                {saving ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProfileReview;
