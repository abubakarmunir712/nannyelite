import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Save, Loader2, Camera, X, Upload, Trash2, Plus, Pencil,
  User, MapPin, GraduationCap, Baby, Briefcase, Clock, Video, FileText,
} from "lucide-react";
import MediaIntroRecorder from "@/components/MediaIntroRecorder";
import SEO from "@/components/SEO";
import LocationInput, { type LocationData } from "@/components/LocationInput";

const CAREGIVER_TYPES = [
  { id: "babysitter", label: "Babysitter" },
  { id: "au_pair", label: "Au Pair" },
  { id: "nanny_assistant", label: "Nanny Assistant" },
  { id: "part_time_nanny", label: "Part-time Nanny" },
  { id: "full_time_nanny", label: "Full-time Nanny" },
];

const AVAIL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const AVAIL_PERIODS = ["Morning", "Afternoon", "Evening"];

type SlotKey = string; // "Monday-Morning" etc.

interface SelfReference {
  id: string;
  family_name: string;
  relationship: string | null;
  service_period: string | null;
  testimonial: string | null;
  reference_letter_url: string | null;
}

const EditNannyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [nannyProfile, setNannyProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [locationData, setLocationData] = useState<LocationData>({
    postalCode: "", city: "", state: "", country: "Switzerland", latitude: null, longitude: null,
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLang, setNewLang] = useState("");
  const [bio, setBio] = useState("");
  const [nationality, setNationality] = useState("");
  const [yearsExp, setYearsExp] = useState<number>(0);
  const [education, setEducation] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("non_smoker");
  const [comfortablePets, setComfortablePets] = useState(false);
  const [hasDriversLicense, setHasDriversLicense] = useState(false);
  const [hasCar, setHasCar] = useState(false);
  const [caregiverTypes, setCaregiverTypes] = useState<string[]>([]);

  // Experience
  const [expInfants, setExpInfants] = useState(false);
  const [expToddlers, setExpToddlers] = useState(false);
  const [expPreschool, setExpPreschool] = useState(false);
  const [expSchoolAge, setExpSchoolAge] = useState(false);
  const [expTeenagers, setExpTeenagers] = useState(false);
  const [expSpecialNeeds, setExpSpecialNeeds] = useState(false);
  const [specialNeedsDetails, setSpecialNeedsDetails] = useState("");

  // Certifications
  const [hasFirstAid, setHasFirstAid] = useState(false);
  const [hasCpr, setHasCpr] = useState(false);
  const [hasEarlyChildhood, setHasEarlyChildhood] = useState(false);
  const [hasChildPsych, setHasChildPsych] = useState(false);
  const [hasNutrition, setHasNutrition] = useState(false);
  const [hasMontessori, setHasMontessori] = useState(false);
  const [otherCerts, setOtherCerts] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");

  // Skills
  const [canCook, setCanCook] = useState(false);
  const [canDrive, setCanDrive] = useState(false);
  const [canHelpHomework, setCanHelpHomework] = useState(false);
  const [canHousekeep, setCanHousekeep] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState("");

  // Services
  const [offersDateNight, setOffersDateNight] = useState(false);
  const [offersOvernight, setOffersOvernight] = useState(false);
  const [offersAfterSchool, setOffersAfterSchool] = useState(false);
  const [offersWeekendHoliday, setOffersWeekendHoliday] = useState(false);
  const [offersFullTime, setOffersFullTime] = useState(false);
  const [offersPartTime, setOffersPartTime] = useState(false);
  const [cleaningOnly, setCleaningOnly] = useState(false);

  // Rates
  const [babysittingRate, setBabysittingRate] = useState("");
  const [partTimeRate, setPartTimeRate] = useState("");

  // Availability (day-level booleans for nanny_profiles)
  const [availMon, setAvailMon] = useState(false);
  const [availTue, setAvailTue] = useState(false);
  const [availWed, setAvailWed] = useState(false);
  const [availThu, setAvailThu] = useState(false);
  const [availFri, setAvailFri] = useState(false);
  const [availSat, setAvailSat] = useState(false);
  const [availSun, setAvailSun] = useState(false);
  const [availSchoolHolidays, setAvailSchoolHolidays] = useState(false);
  const [availNotes, setAvailNotes] = useState("");
  const [workRadius, setWorkRadius] = useState(15);

  // Availability slots (day x period grid from availability_slots table)
  const [slots, setSlots] = useState<Set<SlotKey>>(new Set());

  // Media
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  // Self references
  const [selfRefs, setSelfRefs] = useState<SelfReference[]>([]);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<SelfReference | null>(null);
  const [refFamilyName, setRefFamilyName] = useState("");
  const [refRelationship, setRefRelationship] = useState("");
  const [refServicePeriod, setRefServicePeriod] = useState("");
  const [refTestimonial, setRefTestimonial] = useState("");
  const [refUploading, setRefUploading] = useState(false);
  const [refLetterUrl, setRefLetterUrl] = useState<string | null>(null);
  const [refSaving, setRefSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const [{ data: p }, { data: np }, { data: ph }, { data: slotsData }, { data: refsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("nanny_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("nanny_photos").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("availability_slots").select("*").eq("user_id", user.id),
      supabase.from("nanny_self_references" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (!np) { navigate("/onboarding/nanny"); return; }

    setProfile(p);
    setNannyProfile(np);
    setPhotos(ph || []);

    // Load availability slots
    const slotSet = new Set<SlotKey>();
    (slotsData || []).forEach((s: any) => slotSet.add(`${s.day}-${s.period}`));
    setSlots(slotSet);

    // Load self references
    setSelfRefs((refsData || []) as unknown as SelfReference[]);

    // Populate fields
    setFullName(p?.full_name || "");
    setLocationData({
      postalCode: np.postal_code || "",
      city: np.city || "",
      state: np.state || "",
      country: np.country || "Switzerland",
      latitude: np.latitude || null,
      longitude: np.longitude || null,
    });
    setLanguages(p?.languages || []);
    setBio(np.bio || "");
    setNationality(np.nationality || "");
    setYearsExp(np.years_of_experience || 0);
    setEducation(np.education || "");
    setSmokingStatus(np.smoking_status || "non_smoker");
    setComfortablePets(np.comfortable_with_pets || false);
    setHasDriversLicense(np.has_drivers_license || false);
    setHasCar(np.has_car || false);
    setCaregiverTypes(np.caregiver_types || []);

    setExpInfants(np.experience_infants || false);
    setExpToddlers(np.experience_toddlers || false);
    setExpPreschool(np.experience_preschool || false);
    setExpSchoolAge(np.experience_school_age || false);
    setExpTeenagers(np.experience_teenagers || false);
    setExpSpecialNeeds(np.experience_special_needs || false);
    setSpecialNeedsDetails(np.special_needs_details || "");

    setHasFirstAid(np.has_first_aid || false);
    setHasCpr(np.has_cpr || false);
    setHasEarlyChildhood(np.has_early_childhood_cert || false);
    setHasChildPsych(np.has_child_psychology || false);
    setHasNutrition(np.has_nutrition_cert || false);
    setHasMontessori(np.has_montessori_cert || false);
    setOtherCerts(np.other_certifications || []);

    setCanCook(np.can_cook || false);
    setCanDrive(np.can_drive || false);
    setCanHelpHomework(np.can_help_homework || false);
    setCanHousekeep(np.can_do_light_housekeeping || false);
    setActivities(np.activities_offered || []);

    setOffersDateNight(np.offers_date_night || false);
    setOffersOvernight(np.offers_overnight || false);
    setOffersAfterSchool(np.offers_after_school || false);
    setOffersWeekendHoliday(np.offers_weekend_holiday || false);
    setOffersFullTime(np.offers_full_time || false);
    setOffersPartTime(np.offers_part_time || false);
    setCleaningOnly(np.available_cleaning_only || false);

    setBabysittingRate(np.babysitting_rate_chf?.toString() || "");
    setPartTimeRate(np.part_time_childcare_rate_chf?.toString() || "");

    setAvailMon(np.available_monday || false);
    setAvailTue(np.available_tuesday || false);
    setAvailWed(np.available_wednesday || false);
    setAvailThu(np.available_thursday || false);
    setAvailFri(np.available_friday || false);
    setAvailSat(np.available_saturday || false);
    setAvailSun(np.available_sunday || false);
    setAvailSchoolHolidays(np.available_school_holidays || false);
    setAvailNotes(np.availability_notes || "");
    setWorkRadius(np.work_radius_km || 20);

    setVideoUrl(np.video_intro_url || null);
    setVoiceUrl(np.voice_intro_url || null);

    setLoading(false);
  };

  // Availability slot toggling
  const toggleSlot = (day: string, period: string) => {
    const key: SlotKey = `${day}-${period}`;
    setSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllDay = (day: string) => {
    const allSelected = AVAIL_PERIODS.every(p => slots.has(`${day}-${p}`));
    setSlots(prev => {
      const next = new Set(prev);
      AVAIL_PERIODS.forEach(p => {
        const key = `${day}-${p}`;
        if (allSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const toggleColumn = (period: string) => {
    const allSelected = AVAIL_DAYS.every(d => slots.has(`${d}-${period}`));
    setSlots(prev => {
      const next = new Set(prev);
      AVAIL_DAYS.forEach(d => {
        const key = `${d}-${period}`;
        if (allSelected) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Use location data from LocationInput component
      const derivedLocation = locationData.city
        ? `${locationData.city}, ${locationData.country}`
        : locationData.country || "";
      const geoLat = locationData.latitude;
      const geoLng = locationData.longitude;

      // Update profiles table
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, location: derivedLocation, languages })
        .eq("user_id", user.id);
      if (profileErr) throw profileErr;

      // Derive day booleans from slots
      const dayHasSlot = (day: string) => AVAIL_PERIODS.some(p => slots.has(`${day}-${p}`));

      // Update nanny_profiles table
      const { error: nannyErr } = await supabase
        .from("nanny_profiles")
        .update({
          bio, nationality, years_of_experience: yearsExp, education,
          postal_code: locationData.postalCode || null, city: locationData.city || null,
          state: locationData.state || null, country: locationData.country || null,
          latitude: geoLat, longitude: geoLng,
          smoking_status: smokingStatus, comfortable_with_pets: comfortablePets,
          has_drivers_license: hasDriversLicense, has_car: hasCar,
          caregiver_types: caregiverTypes,
          experience_infants: expInfants, experience_toddlers: expToddlers,
          experience_preschool: expPreschool, experience_school_age: expSchoolAge,
          experience_teenagers: expTeenagers, experience_special_needs: expSpecialNeeds,
          special_needs_details: specialNeedsDetails || null,
          has_first_aid: hasFirstAid, has_cpr: hasCpr,
          has_early_childhood_cert: hasEarlyChildhood, has_child_psychology: hasChildPsych,
          has_nutrition_cert: hasNutrition, has_montessori_cert: hasMontessori,
          other_certifications: otherCerts,
          can_cook: canCook, can_drive: canDrive,
          can_help_homework: canHelpHomework, can_do_light_housekeeping: canHousekeep,
          activities_offered: activities,
          offers_date_night: offersDateNight, offers_overnight: offersOvernight,
          offers_after_school: offersAfterSchool, offers_weekend_holiday: offersWeekendHoliday,
          offers_full_time: offersFullTime, offers_part_time: offersPartTime,
          available_cleaning_only: cleaningOnly,
          babysitting_rate_chf: babysittingRate ? parseFloat(babysittingRate) : null,
          part_time_childcare_rate_chf: partTimeRate ? parseFloat(partTimeRate) : null,
          available_monday: dayHasSlot("Monday"),
          available_tuesday: dayHasSlot("Tuesday"),
          available_wednesday: dayHasSlot("Wednesday"),
          available_thursday: dayHasSlot("Thursday"),
          available_friday: dayHasSlot("Friday"),
          available_saturday: dayHasSlot("Saturday"),
          available_sunday: dayHasSlot("Sunday"),
          available_school_holidays: availSchoolHolidays,
          availability_notes: availNotes || null,
          work_radius_km: workRadius,
          video_intro_url: videoUrl, voice_intro_url: voiceUrl,
        })
        .eq("user_id", user.id);
      if (nannyErr) throw nannyErr;

      // Sync availability_slots: delete all, then insert current
      await supabase.from("availability_slots").delete().eq("user_id", user.id);
      const slotsToInsert = Array.from(slots).map(key => {
        const [day, period] = key.split("-");
        return { user_id: user.id, day, period };
      });
      if (slotsToInsert.length > 0) {
        const { error: slotErr } = await supabase.from("availability_slots").insert(slotsToInsert);
        if (slotErr) throw slotErr;
      }

      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Photo handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("nanny-photos").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("nanny-photos").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("nanny_photos").insert({
          user_id: user.id, photo_url: urlData.publicUrl,
          display_order: photos.length, is_primary: photos.length === 0,
        });
        if (dbErr) throw dbErr;
      }
      const { data: ph } = await supabase.from("nanny_photos").select("*").eq("user_id", user.id).order("display_order");
      setPhotos(ph || []);
      toast({ title: "Photos uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    const { error } = await supabase.from("nanny_photos").delete().eq("id", photoId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    toast({ title: "Photo deleted" });
  };

  const setPrimaryPhoto = async (photoId: string) => {
    if (!user) return;
    await supabase.from("nanny_photos").update({ is_primary: false }).eq("user_id", user.id);
    await supabase.from("nanny_photos").update({ is_primary: true }).eq("id", photoId);
    setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === photoId })));
    toast({ title: "Primary photo updated" });
  };

  // Tag helpers
  const addTag = (value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };
  const removeTag = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(v => v !== value));
  };

  // Reference handlers
  const openRefDialog = (ref?: SelfReference) => {
    if (ref) {
      setEditingRef(ref);
      setRefFamilyName(ref.family_name);
      setRefRelationship(ref.relationship || "");
      setRefServicePeriod(ref.service_period || "");
      setRefTestimonial(ref.testimonial || "");
      setRefLetterUrl(ref.reference_letter_url || null);
    } else {
      setEditingRef(null);
      setRefFamilyName("");
      setRefRelationship("");
      setRefServicePeriod("");
      setRefTestimonial("");
      setRefLetterUrl(null);
    }
    setRefDialogOpen(true);
  };

  const handleRefLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    setRefUploading(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/ref-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("nanny-documents").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("nanny-documents").getPublicUrl(path);
      setRefLetterUrl(data.publicUrl);
      toast({ title: "Letter uploaded" });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setRefUploading(false);
    }
  };

  const handleRefSave = async () => {
    if (!user || !refFamilyName.trim()) return;
    setRefSaving(true);
    try {
      const payload = {
        user_id: user.id,
        family_name: refFamilyName.trim(),
        relationship: refRelationship || null,
        service_period: refServicePeriod || null,
        testimonial: refTestimonial || null,
        reference_letter_url: refLetterUrl || null,
      };

      if (editingRef) {
        const { error } = await supabase.from("nanny_self_references" as any).update(payload as any).eq("id", editingRef.id);
        if (error) throw error;
        toast({ title: "Reference updated" });
      } else {
        const { error } = await supabase.from("nanny_self_references" as any).insert(payload as any);
        if (error) throw error;
        toast({ title: "Reference added" });
      }
      setRefDialogOpen(false);
      // Reload
      const { data } = await supabase.from("nanny_self_references" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setSelfRefs((data || []) as unknown as SelfReference[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRefSaving(false);
    }
  };

  const deleteRef = async (id: string) => {
    const { error } = await supabase.from("nanny_self_references" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSelfRefs(prev => prev.filter(r => r.id !== id));
    toast({ title: "Reference deleted" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const CheckboxField = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-secondary">
      <SEO title="Edit Profile | NannyElite" description="Edit your nanny profile" />

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-bold text-foreground">Edit Profile</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "basic"} className="space-y-6">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-card border border-border p-1">
            <TabsTrigger value="basic" className="gap-1.5"><User className="h-3.5 w-3.5" /> Basic Info</TabsTrigger>
            <TabsTrigger value="experience" className="gap-1.5"><Baby className="h-3.5 w-3.5" /> Experience</TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Certifications</TabsTrigger>
            <TabsTrigger value="services" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Services & Rates</TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Availability</TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5"><Camera className="h-3.5 w-3.5" /> Photos</TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Media</TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> References</TabsTrigger>
          </TabsList>

          {/* ── Basic Info ── */}
          <TabsContent value="basic" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input value={nationality} onChange={e => setNationality(e.target.value)} />
                </div>
                {/* Location fields with validation */}
                <div className="md:col-span-2">
                  <LocationInput value={locationData} onChange={setLocationData} />
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input type="number" min={0} value={yearsExp} onChange={e => setYearsExp(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Education</Label>
                  <Input value={education} onChange={e => setEducation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Smoking Status</Label>
                  <Select value={smokingStatus} onValueChange={setSmokingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_smoker">Non-smoker</SelectItem>
                      <SelectItem value="outside_only">Outside only</SelectItem>
                      <SelectItem value="smoker">Smoker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {languages.map(l => (
                    <Badge key={l} variant="secondary" className="gap-1">
                      {l} <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(l, languages, setLanguages)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="Add language"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag(newLang, languages, setLanguages, setNewLang))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(newLang, languages, setLanguages, setNewLang)}>Add</Button>
                </div>
              </div>

              {/* Bio / Description */}
              <div className="space-y-2">
                <Label>Profile Description</Label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} placeholder="Tell families about yourself..." />
              </div>

              {/* About me checks */}
              <div className="space-y-2">
                <Label>Comfortable With</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <CheckboxField checked={comfortablePets} onChange={setComfortablePets} label="Comfortable with pets" />
                  <CheckboxField checked={hasDriversLicense} onChange={setHasDriversLicense} label="Driver's license" />
                  <CheckboxField checked={hasCar} onChange={setHasCar} label="Own car" />
                </div>
              </div>

              {/* Caregiver types */}
              <div className="space-y-2">
                <Label>Caregiver Type(s)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CAREGIVER_TYPES.map(ct => (
                    <label key={ct.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      caregiverTypes.includes(ct.id) ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <Checkbox
                        checked={caregiverTypes.includes(ct.id)}
                        onCheckedChange={(checked) => {
                          setCaregiverTypes(checked
                            ? [...caregiverTypes, ct.id]
                            : caregiverTypes.filter(t => t !== ct.id)
                          );
                        }}
                      />
                      <span className="text-sm font-medium text-foreground">{ct.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Experience ── */}
          <TabsContent value="experience" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Age Group Experience</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CheckboxField checked={expInfants} onChange={setExpInfants} label="Infants (0-1)" />
                <CheckboxField checked={expToddlers} onChange={setExpToddlers} label="Toddlers (1-3)" />
                <CheckboxField checked={expPreschool} onChange={setExpPreschool} label="Preschool (3-5)" />
                <CheckboxField checked={expSchoolAge} onChange={setExpSchoolAge} label="School Age (5-12)" />
                <CheckboxField checked={expTeenagers} onChange={setExpTeenagers} label="Teenagers (12+)" />
                <CheckboxField checked={expSpecialNeeds} onChange={setExpSpecialNeeds} label="Special Needs" />
              </div>
              {expSpecialNeeds && (
                <div className="space-y-2">
                  <Label>Special Needs Details</Label>
                  <Textarea value={specialNeedsDetails} onChange={e => setSpecialNeedsDetails(e.target.value)} rows={3} />
                </div>
              )}

              <h2 className="font-display text-lg font-semibold text-foreground pt-4">Skills</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CheckboxField checked={canCook} onChange={setCanCook} label="Cooking" />
                <CheckboxField checked={canDrive} onChange={setCanDrive} label="Can drive children" />
                <CheckboxField checked={canHelpHomework} onChange={setCanHelpHomework} label="Homework help" />
                <CheckboxField checked={canHousekeep} onChange={setCanHousekeep} label="Light housekeeping" />
              </div>

              <div className="space-y-2">
                <Label>Activities / Superpowers</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {activities.map(a => (
                    <Badge key={a} variant="secondary" className="gap-1">
                      {a} <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(a, activities, setActivities)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="e.g. Music, Arts, Sports"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag(newActivity, activities, setActivities, setNewActivity))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(newActivity, activities, setActivities, setNewActivity)}>Add</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Certifications ── */}
          <TabsContent value="certifications" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Certifications</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CheckboxField checked={hasFirstAid} onChange={setHasFirstAid} label="First Aid" />
                <CheckboxField checked={hasCpr} onChange={setHasCpr} label="CPR" />
                <CheckboxField checked={hasEarlyChildhood} onChange={setHasEarlyChildhood} label="Early Childhood" />
                <CheckboxField checked={hasChildPsych} onChange={setHasChildPsych} label="Child Psychology" />
                <CheckboxField checked={hasNutrition} onChange={setHasNutrition} label="Nutrition" />
                <CheckboxField checked={hasMontessori} onChange={setHasMontessori} label="Montessori" />
              </div>

              <div className="space-y-2">
                <Label>Other Certifications</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {otherCerts.map(c => (
                    <Badge key={c} variant="secondary" className="gap-1">
                      {c} <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(c, otherCerts, setOtherCerts)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newCert} onChange={e => setNewCert(e.target.value)} placeholder="Add certification"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag(newCert, otherCerts, setOtherCerts, setNewCert))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(newCert, otherCerts, setOtherCerts, setNewCert)}>Add</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Services & Rates ── */}
          <TabsContent value="services" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Services Offered</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <CheckboxField checked={offersDateNight} onChange={setOffersDateNight} label="Date-Night" />
                <CheckboxField checked={offersOvernight} onChange={setOffersOvernight} label="Overnight" />
                <CheckboxField checked={offersAfterSchool} onChange={setOffersAfterSchool} label="After-School" />
                <CheckboxField checked={offersWeekendHoliday} onChange={setOffersWeekendHoliday} label="Weekend & Holiday" />
                <CheckboxField checked={offersFullTime} onChange={setOffersFullTime} label="Full-Time" />
                <CheckboxField checked={offersPartTime} onChange={setOffersPartTime} label="Part-Time" />
                <CheckboxField checked={cleaningOnly} onChange={setCleaningOnly} label="Also available for cleaning" />
              </div>

              <h2 className="font-display text-lg font-semibold text-foreground pt-4">Rates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Babysitting Rate (CHF/hour)</Label>
                  <Input type="number" min={0} value={babysittingRate} onChange={e => setBabysittingRate(e.target.value)} placeholder="e.g. 30" />
                </div>
                <div className="space-y-2">
                  <Label>Part-time Childcare Rate (CHF/hour)</Label>
                  <Input type="number" min={0} value={partTimeRate} onChange={e => setPartTimeRate(e.target.value)} placeholder="e.g. 25" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Availability ── */}
          <TabsContent value="availability" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-foreground">Weekly Availability</h2>
              <p className="text-sm text-muted-foreground">Click cells to toggle your availability. Click day names for all-day, or period headers for all days.</p>

              {/* Availability grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs font-medium text-muted-foreground text-left"></th>
                      {AVAIL_PERIODS.map(period => (
                        <th key={period} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleColumn(period)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {period}
                          </button>
                        </th>
                      ))}
                      <th className="p-2 text-center">
                        <span className="text-xs font-medium text-muted-foreground">All Day</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AVAIL_DAYS.map(day => {
                      const allSelected = AVAIL_PERIODS.every(p => slots.has(`${day}-${p}`));
                      return (
                        <tr key={day} className="border-t border-border">
                          <td className="p-2 text-sm font-medium text-foreground">{day.slice(0, 3)}</td>
                          {AVAIL_PERIODS.map(period => {
                            const key = `${day}-${period}`;
                            const selected = slots.has(key);
                            return (
                              <td key={period} className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSlot(day, period)}
                                  className={`w-full h-10 rounded-lg text-xs font-medium transition-colors ${
                                    selected
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {selected ? "✓" : "–"}
                                </button>
                              </td>
                            );
                          })}
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAllDay(day)}
                              className={`w-full h-10 rounded-lg text-xs font-medium transition-colors ${
                                allSelected
                                  ? "bg-primary/80 text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {allSelected ? "✓ All" : "All"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <CheckboxField checked={availSchoolHolidays} onChange={setAvailSchoolHolidays} label="Available during school holidays" />

              <div className="space-y-2">
                <Label>Work Radius (km)</Label>
                <Select value={workRadius.toString()} onValueChange={v => setWorkRadius(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 60, 100].map(r => (
                      <SelectItem key={r} value={r.toString()}>{r} km</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Availability Notes</Label>
                <Textarea value={availNotes} onChange={e => setAvailNotes(e.target.value)} rows={3} placeholder="Any additional notes about your availability..." />
              </div>
            </div>
          </TabsContent>

          {/* ── Photos ── */}
          <TabsContent value="photos" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">Profile Photos</h2>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  <Button asChild variant="outline" size="sm" className="rounded-full gap-2" disabled={uploadingPhoto}>
                    <span>
                      {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Photos
                    </span>
                  </Button>
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No photos yet. Upload your first photo!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative group">
                      <div className={`aspect-square rounded-xl overflow-hidden border-2 ${
                        photo.is_primary ? "border-primary" : "border-border"
                      }`}>
                        <img src={photo.photo_url} alt="Profile photo" className="w-full h-full object-cover" />
                      </div>
                      {photo.is_primary && (
                        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">Primary</Badge>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!photo.is_primary && (
                          <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full" onClick={() => setPrimaryPhoto(photo.id)}>
                            <User className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full" onClick={() => deletePhoto(photo.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Media ── */}
          <TabsContent value="media" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Video & Voice Introductions</h2>
              <MediaIntroRecorder
                videoUrl={videoUrl}
                voiceUrl={voiceUrl}
                onVideoChange={setVideoUrl}
                onVoiceChange={setVoiceUrl}
              />
            </div>
          </TabsContent>

          {/* ── References ── */}
          <TabsContent value="references" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Professional References</h2>
                  <p className="text-sm text-muted-foreground mt-1">Add references from families you've worked with. You can also upload reference letters.</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => openRefDialog()}>
                  <Plus className="h-3.5 w-3.5" /> Add Reference
                </Button>
              </div>

              {selfRefs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No references yet. Add your first reference!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selfRefs.map(ref => (
                    <div key={ref.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{ref.family_name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {ref.relationship && <span>{ref.relationship}</span>}
                            {ref.relationship && ref.service_period && <span>•</span>}
                            {ref.service_period && <span>{ref.service_period}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openRefDialog(ref)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRef(ref.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {ref.testimonial && (
                        <p className="text-sm text-muted-foreground leading-relaxed italic">"{ref.testimonial}"</p>
                      )}
                      {ref.reference_letter_url && (
                        <a href={ref.reference_letter_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <FileText className="h-3 w-3" /> View reference letter
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reference Dialog */}
            <Dialog open={refDialogOpen} onOpenChange={setRefDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRef ? "Edit Reference" : "Add Reference"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Family Name *</Label>
                    <Input value={refFamilyName} onChange={e => setRefFamilyName(e.target.value)} placeholder="e.g. The Smith Family" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Input value={refRelationship} onChange={e => setRefRelationship(e.target.value)} placeholder="e.g. Regular babysitter" />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Period</Label>
                      <Input value={refServicePeriod} onChange={e => setRefServicePeriod(e.target.value)} placeholder="e.g. Jan – Jun 2025" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Testimonial</Label>
                    <Textarea value={refTestimonial} onChange={e => setRefTestimonial(e.target.value)} rows={4} placeholder="What did the family say about your work?" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Letter (optional)</Label>
                    {refLetterUrl ? (
                      <div className="flex items-center gap-2">
                        <a href={refLetterUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> Letter uploaded
                        </a>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setRefLetterUrl(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleRefLetterUpload} />
                        <Button asChild variant="outline" size="sm" className="gap-2" disabled={refUploading}>
                          <span>
                            {refUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Upload Letter
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                  <Button onClick={handleRefSave} className="w-full rounded-full" disabled={refSaving || !refFamilyName.trim()}>
                    {refSaving ? "Saving..." : editingRef ? "Update Reference" : "Add Reference"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Bottom save bar */}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditNannyProfile;
