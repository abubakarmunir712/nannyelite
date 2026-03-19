import { useState, useEffect, useRef, useCallback } from "react";
import LocationStep, { type LocationStepData } from "@/components/onboarding/LocationStep";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Sparkles, Upload, X, Camera, FileText,
  Check, Loader2, Shield, Phone, Mail, Video, Mic, MicOff,
  MapPin, User, Baby, Heart, Briefcase, Home, Star, Eye,
} from "lucide-react";
import MediaIntroRecorder from "@/components/MediaIntroRecorder";
import ProfileVisibilitySelector from "@/components/ProfileVisibilitySelector";
import CertificateUpload, { type Certificate } from "@/components/CertificateUpload";
import DiditVerificationPopup from "@/components/DiditVerificationPopup";

// ─── Types ───
interface ProfileData {
  bio: string;
  years_of_experience: number | null;
  nationality: string | null;
  languages: string[];
  education: string | null;
  smoking_status: string;
  comfortable_with_pets: boolean;
  has_drivers_license: boolean;
  experience_infants: boolean;
  experience_toddlers: boolean;
  experience_preschool: boolean;
  experience_school_age: boolean;
  experience_teenagers: boolean;
  experience_special_needs: boolean;
  special_needs_details: string | null;
  has_first_aid: boolean;
  has_cpr: boolean;
  has_early_childhood_cert: boolean;
  has_child_psychology: boolean;
  has_nutrition_cert: boolean;
  has_montessori_cert: boolean;
  other_certifications: string[];
  offers_date_night: boolean;
  offers_overnight: boolean;
  offers_after_school: boolean;
  offers_weekend_holiday: boolean;
  offers_full_time: boolean;
  offers_part_time: boolean;
  can_cook: boolean;
  can_drive: boolean;
  has_car: boolean;
  can_help_homework: boolean;
  can_do_light_housekeeping: boolean;
  activities_offered: string[];
}

const STEPS = [
  { label: "Your Role", icon: User },
  { label: "Location", icon: MapPin },
  { label: "Your Story", icon: Sparkles },
  { label: "Review Profile", icon: FileText },
  { label: "Rates & Schedule", icon: Star },
  { label: "Profile Photo", icon: Camera },
  { label: "Media & Certs", icon: Video },
  { label: "Visibility", icon: Shield },
];

const CAREGIVER_TYPES = [
  { id: "babysitter", label: "Babysitter", icon: Baby, color: "bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-950/30 dark:border-pink-800 dark:text-pink-300", desc: "Occasional childcare (evenings or weekends)" },
  { id: "au_pair", label: "Au Pair", icon: Heart, color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300", desc: "Live-in childcare support for families" },
  { id: "nanny_assistant", label: "Nanny Assistant", icon: User, color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300", desc: "Supports parents with childcare routines" },
  { id: "part_time_nanny", label: "Part-time Nanny", icon: Star, color: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300", desc: "Regular childcare with limited weekly hours" },
  { id: "full_time_nanny", label: "Full-time Nanny", icon: Briefcase, color: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300", desc: "Full weekly childcare commitment (40+ hours)" },
];

const NARRATIVE_SCRIPT = `Tell us about yourself! Here's what to cover:

• Your name, nationality, and languages you speak
• Your education and qualifications
• How many years you've been caring for children
• Age groups you've worked with (babies, toddlers, preschool, school-age, teens)
• Experience with children with special needs
• Your certifications (First Aid, CPR, early childhood, Montessori, etc.)
• Types of care you offer (date-night sitting, overnight, after-school, full-time)
• Extra skills (cooking for kids, driving, homework help)
• Whether you're comfortable with pets, and if you smoke or not
• Activities you enjoy doing with children (arts & crafts, sports, music, outdoors)
• What makes you unique as a caregiver

Write freely — our AI will organize everything into your professional profile!`;

const DAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
] as const;

const PERIODS = [
  { key: "BEFORE_SCHOOL", label: "Before School", time: "6–8am" },
  { key: "MORNING", label: "Morning", time: "8–12pm" },
  { key: "MIDDAY", label: "Midday", time: "12–2pm" },
  { key: "AFTERNOON", label: "Afternoon", time: "2–4pm" },
  { key: "AFTER_SCHOOL", label: "After School", time: "4–6pm" },
  { key: "EVENING", label: "Evening", time: "6–9pm" },
  { key: "NIGHT", label: "Night", time: "9pm+" },
] as const;

type SlotKey = `${typeof DAYS[number]["key"]}_${typeof PERIODS[number]["key"]}`;

const NannyOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 0: Role selection
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [cleaningOnly, setCleaningOnly] = useState(false);

  // Step 1: Location
  const [locationData, setLocationData] = useState<LocationStepData>({
    postalCode: "", city: "", state: "", country: "Switzerland", latitude: null, longitude: null,
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [workRadius, setWorkRadius] = useState(20);

  // Step 2: Narrative
  const [narrative, setNarrative] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechLang, setSpeechLang] = useState(() => {
    const browserLang = navigator.language?.toLowerCase() || "en-us";
    if (browserLang.startsWith("de")) return "de-DE";
    if (browserLang.startsWith("fr")) return "fr-FR";
    if (browserLang.startsWith("it")) return "it-IT";
    return "en-US";
  });

  // Step 3: Editable fields
  const [bio, setBio] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [nationality, setNationality] = useState("");
  const [languagesStr, setLanguagesStr] = useState("");
  const [education, setEducation] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("non_smoker");
  const [specialNeedsDetails, setSpecialNeedsDetails] = useState("");
  const [otherCertsStr, setOtherCertsStr] = useState("");
  const [activitiesStr, setActivitiesStr] = useState("");
  const [comfortableWithPets, setComfortableWithPets] = useState(false);
  const [hasDriversLicense, setHasDriversLicense] = useState(false);

  const [expInfants, setExpInfants] = useState(false);
  const [expToddlers, setExpToddlers] = useState(false);
  const [expPreschool, setExpPreschool] = useState(false);
  const [expSchoolAge, setExpSchoolAge] = useState(false);
  const [expTeenagers, setExpTeenagers] = useState(false);
  const [expSpecialNeeds, setExpSpecialNeeds] = useState(false);

  const [certFirstAid, setCertFirstAid] = useState(false);
  const [certCpr, setCertCpr] = useState(false);
  const [certEarlyChild, setCertEarlyChild] = useState(false);
  const [certPsychology, setCertPsychology] = useState(false);
  const [certNutrition, setCertNutrition] = useState(false);
  const [certMontessori, setCertMontessori] = useState(false);

  const [offDateNight, setOffDateNight] = useState(false);
  const [offOvernight, setOffOvernight] = useState(false);
  const [offAfterSchool, setOffAfterSchool] = useState(false);
  const [offWeekend, setOffWeekend] = useState(false);
  const [offFullTime, setOffFullTime] = useState(false);
  const [offPartTime, setOffPartTime] = useState(false);

  const [canCook, setCanCook] = useState(false);
  const [canDrive, setCanDrive] = useState(false);
  const [hasCar, setHasCar] = useState(false);
  const [canHomework, setCanHomework] = useState(false);
  const [canHousekeeping, setCanHousekeeping] = useState(false);

  // Step 4: Rates & availability
  const [babysittingRate, setBabysittingRate] = useState("");
  const [partTimeRate, setPartTimeRate] = useState("");
  const [availSlots, setAvailSlots] = useState<Set<SlotKey>>(new Set());
  const [availNotes, setAvailNotes] = useState("");
  const [schoolHolidays, setSchoolHolidays] = useState(false);

  // Step 5: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<{ file: File; preview: string } | null>(null);

  // Step 6: Photos & Media
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [videoIntroUrl, setVideoIntroUrl] = useState<string | null>(null);
  const [voiceIntroUrl, setVoiceIntroUrl] = useState<string | null>(null);

  // Step 7: Documents → now Certificates + Visibility
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [showDiditPopup, setShowDiditPopup] = useState(false);

  // General
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ─── Speech Recognition ───
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang;
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            setNarrative((prev) => prev + event.results[i][0].transcript + " ");
          }
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, [speechLang]);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // ─── LocalStorage Progress Saving ───
  const STORAGE_KEY = "nanny_onboarding_progress";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.step != null) setStep(d.step);
        if (d.selectedTypes) setSelectedTypes(d.selectedTypes);
        if (d.cleaningOnly != null) setCleaningOnly(d.cleaningOnly);
        if (d.locationData) setLocationData(d.locationData);
        if (d.phoneNumber) setPhoneNumber(d.phoneNumber);
        if (d.workRadius) setWorkRadius(d.workRadius);
        if (d.narrative) setNarrative(d.narrative);
        if (d.bio) setBio(d.bio);
        if (d.yearsExp) setYearsExp(d.yearsExp);
        if (d.nationality) setNationality(d.nationality);
        if (d.languagesStr) setLanguagesStr(d.languagesStr);
        if (d.education) setEducation(d.education);
        if (d.smokingStatus) setSmokingStatus(d.smokingStatus);
        if (d.babysittingRate) setBabysittingRate(d.babysittingRate);
        if (d.partTimeRate) setPartTimeRate(d.partTimeRate);
        if (d.availNotes) setAvailNotes(d.availNotes);
        if (d.availSlots) setAvailSlots(new Set(d.availSlots));
        if (d.speechLang) setSpeechLang(d.speechLang);
      } catch { /* ignore corrupt data */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const data = {
      step, selectedTypes, cleaningOnly, locationData, phoneNumber, workRadius,
      narrative, bio, yearsExp, nationality, languagesStr, education, smokingStatus,
      babysittingRate, partTimeRate, availNotes, availSlots: Array.from(availSlots), speechLang,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [step, selectedTypes, cleaningOnly, locationData, phoneNumber, workRadius,
      narrative, bio, yearsExp, nationality, languagesStr, education, smokingStatus,
      babysittingRate, partTimeRate, availNotes, availSlots, speechLang]);

  // ─── Swiss Phone Validation ───
  const isValidSwissPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, "");
    return /^(\+41|0041|0)[1-9]\d{8}$/.test(cleaned);
  };


  const toggleDictation = () => {
    if (!recognition) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in your browser. Try Chrome or Edge.", variant: "destructive" });
      return;
    }
    if (isListening) { recognition.stop(); setIsListening(false); }
    else { recognition.start(); setIsListening(true); }
  };

  const toggleSlot = (day: string, period: string) => {
    const key = `${day}_${period}` as SlotKey;
    setAvailSlots((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleRow = (periodKey: string) => {
    setAvailSlots((prev) => {
      const next = new Set(prev);
      const keys = DAYS.map((d) => `${d.key}_${periodKey}` as SlotKey);
      const allActive = keys.every((k) => next.has(k));
      keys.forEach((k) => (allActive ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleColumn = (dayKey: string) => {
    setAvailSlots((prev) => {
      const next = new Set(prev);
      const keys = PERIODS.map((p) => `${dayKey}_${p.key}` as SlotKey);
      const allActive = keys.every((k) => next.has(k));
      keys.forEach((k) => (allActive ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const toggleCaregiverType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };


  const handleGenerateProfile = async () => {
    if (narrative.trim().length < 50) {
      toast({ title: "Tell us more", description: "Please write at least a few sentences about yourself.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("generate-nanny-profile", {
        body: { narrative },
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      if (error) throw error;
      setProfileData(data);
      setBio(data.bio || "");
      setYearsExp(data.years_of_experience?.toString() || "");
      setNationality(data.nationality || "");
      setLanguagesStr((data.languages || []).join(", "));
      setEducation(data.education || "");
      setSmokingStatus(data.smoking_status || "non_smoker");
      setComfortableWithPets(!!data.comfortable_with_pets);
      setHasDriversLicense(!!data.has_drivers_license);
      setSpecialNeedsDetails(data.special_needs_details || "");
      setOtherCertsStr((data.other_certifications || []).join(", "));
      setActivitiesStr((data.activities_offered || []).join(", "));
      setExpInfants(!!data.experience_infants);
      setExpToddlers(!!data.experience_toddlers);
      setExpPreschool(!!data.experience_preschool);
      setExpSchoolAge(!!data.experience_school_age);
      setExpTeenagers(!!data.experience_teenagers);
      setExpSpecialNeeds(!!data.experience_special_needs);
      setCertFirstAid(!!data.has_first_aid);
      setCertCpr(!!data.has_cpr);
      setCertEarlyChild(!!data.has_early_childhood_cert);
      setCertPsychology(!!data.has_child_psychology);
      setCertNutrition(!!data.has_nutrition_cert);
      setCertMontessori(!!data.has_montessori_cert);
      setOffDateNight(!!data.offers_date_night);
      setOffOvernight(!!data.offers_overnight);
      setOffAfterSchool(!!data.offers_after_school);
      setOffWeekend(!!data.offers_weekend_holiday);
      setOffFullTime(!!data.offers_full_time);
      setOffPartTime(!!data.offers_part_time);
      setCanCook(!!data.can_cook);
      setCanDrive(!!data.can_drive);
      setHasCar(!!data.has_car);
      setCanHomework(!!data.can_help_homework);
      setCanHousekeeping(!!data.can_do_light_housekeeping);
      if (data.suggested_babysitting_rate && !babysittingRate) setBabysittingRate(data.suggested_babysitting_rate.toString());
      if (data.suggested_part_time_rate && !partTimeRate) setPartTimeRate(data.suggested_part_time_rate.toString());
      setStep(3);
      toast({ title: "Profile generated!", description: "Review and edit the details below." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message || "Please try again.", variant: "destructive" });
    }
    setAiLoading(false);
  };

  // ─── Photo handling ───
  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 10));
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Final save ───
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error: profileError } = await supabase.from("nanny_profiles").upsert({
        user_id: user.id,
        bio,
        ai_generated_description: narrative,
        years_of_experience: yearsExp ? parseInt(yearsExp) : 0,
        nationality,
        education: education || null,
        smoking_status: smokingStatus,
        comfortable_with_pets: comfortableWithPets,
        has_drivers_license: hasDriversLicense,
        experience_infants: expInfants,
        experience_toddlers: expToddlers,
        experience_preschool: expPreschool,
        experience_school_age: expSchoolAge,
        experience_teenagers: expTeenagers,
        experience_special_needs: expSpecialNeeds,
        special_needs_details: specialNeedsDetails || null,
        has_first_aid: certFirstAid,
        has_cpr: certCpr,
        has_early_childhood_cert: certEarlyChild,
        has_child_psychology: certPsychology,
        has_nutrition_cert: certNutrition,
        has_montessori_cert: certMontessori,
        other_certifications: otherCertsStr ? otherCertsStr.split(",").map((s) => s.trim()) : [],
        offers_date_night: offDateNight,
        offers_overnight: offOvernight,
        offers_after_school: offAfterSchool,
        offers_weekend_holiday: offWeekend,
        offers_full_time: offFullTime,
        offers_part_time: offPartTime,
        hourly_rate_spot: babysittingRate ? parseFloat(babysittingRate) : null,
        hourly_rate_recurring: partTimeRate ? parseFloat(partTimeRate) : null,
        babysitting_rate_chf: babysittingRate ? parseFloat(babysittingRate) : null,
        part_time_childcare_rate_chf: partTimeRate ? parseFloat(partTimeRate) : null,
        available_monday: Array.from(availSlots).some(k => k.startsWith("MON_")),
        available_tuesday: Array.from(availSlots).some(k => k.startsWith("TUE_")),
        available_wednesday: Array.from(availSlots).some(k => k.startsWith("WED_")),
        available_thursday: Array.from(availSlots).some(k => k.startsWith("THU_")),
        available_friday: Array.from(availSlots).some(k => k.startsWith("FRI_")),
        available_saturday: Array.from(availSlots).some(k => k.startsWith("SAT_")),
        available_sunday: Array.from(availSlots).some(k => k.startsWith("SUN_")),
        availability_notes: availNotes || null,
        available_school_holidays: schoolHolidays,
        video_intro_url: videoIntroUrl,
        voice_intro_url: voiceIntroUrl,
        can_cook: canCook,
        can_drive: canDrive,
        has_car: hasCar,
        can_help_homework: canHomework,
        can_do_light_housekeeping: canHousekeeping,
        activities_offered: activitiesStr ? activitiesStr.split(",").map((s) => s.trim()) : [],
        caregiver_types: selectedTypes,
        available_cleaning_only: cleaningOnly,
        postal_code: locationData.postalCode || null,
        city: locationData.city || null,
        state: locationData.state || null,
        country: locationData.country || null,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        phone_number: phoneNumber || null,
        work_radius_km: workRadius,
        onboarding_completed: true,
        profile_visible: false,
        profile_status: "pending",
      } as any, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Update languages and phone in profiles table
      await supabase.from("profiles").update({
        languages: languagesStr ? languagesStr.split(",").map((s) => s.trim()) : [],
        location: locationData.city ? `${locationData.city}, ${locationData.country}` : locationData.country || null,
        phone: phoneNumber || null,
      }).eq("user_id", user.id);

      // Save availability slots
      await supabase.from("availability_slots").delete().eq("user_id", user.id);
      if (availSlots.size > 0) {
        const slotsToInsert = Array.from(availSlots).map((slotKey) => {
          const [day, ...periodParts] = slotKey.split("_");
          return { user_id: user.id, day, period: periodParts.join("_") };
        });
        await supabase.from("availability_slots").insert(slotsToInsert);
      }

      // Upload profile photo first
      if (profilePhoto) {
        const ext = profilePhoto.file.name.split(".").pop();
        const path = `${user.id}/profile_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("nanny-photos").upload(path, profilePhoto.file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("nanny-photos").getPublicUrl(path);
          await supabase.from("nanny_photos").insert({
            user_id: user.id,
            photo_url: urlData.publicUrl,
            is_primary: true,
            display_order: 0,
          });
          // Also set as avatar
          await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
        }
      }

      // Upload additional photos
      if (photos.length > 0) {
        setUploadingPhotos(true);
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const ext = photo.file.name.split(".").pop();
          const path = `${user.id}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await supabase.storage.from("nanny-photos").upload(path, photo.file);
          if (upErr) continue;
          const { data: urlData } = supabase.storage.from("nanny-photos").getPublicUrl(path);
          await supabase.from("nanny_photos").insert({
            user_id: user.id,
            photo_url: urlData.publicUrl,
            is_primary: false,
            display_order: i + 1,
          });
        }
        setUploadingPhotos(false);
      }

      // Save profile visibility
      await supabase.from("profiles").update({
        profile_visibility: profileVisibility,
      } as any).eq("user_id", user.id);

      toast({
        title: "Profile submitted!",
        description: "Your profile is under review. An admin will review it shortly.",
      });
      localStorage.removeItem(STORAGE_KEY);
      // Show DIDIT verification popup before navigating
      setShowDiditPopup(true);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-primary">NannyElite</h1>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">Build your profile in less than a minute</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {step === 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Families are looking for trusted childcare.{" "}
                <span className="hidden sm:inline">Create your profile quickly and start connecting with families.</span>
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => { if (i < step) setStep(i); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    i < step ? "bg-emerald-500 text-white cursor-pointer" :
                    i === step ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}
                  title={s.label}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {Math.round(((step + 1) / STEPS.length) * 100)}% complete
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* ── STEP 0: Role Selection ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">What type of commitment are you looking for?</h2>
              <p className="text-muted-foreground text-sm">Select all roles that apply to you. This helps families find the right match.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAREGIVER_TYPES.map((type) => {
                const selected = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleCaregiverType(type.id)}
                    className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                      selected
                        ? `${type.color} border-current shadow-md scale-[1.02]`
                        : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-current/20 flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-current/10" : "bg-muted"}`}>
                      <type.icon className={`h-6 w-6 ${selected ? "" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${selected ? "" : "text-foreground"}`}>{type.label}</p>
                      <p className={`text-xs mt-0.5 ${selected ? "opacity-80" : "text-muted-foreground"}`}>{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cleaning optional card */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setCleaningOnly(!cleaningOnly)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  cleaningOnly
                    ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-300 shadow-sm"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {cleaningOnly && (
                  <div className="w-5 h-5 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <Home className={`h-5 w-5 shrink-0 ${cleaningOnly ? "" : "text-muted-foreground"}`} />
                <div>
                  <p className={`font-medium text-sm ${cleaningOnly ? "" : "text-foreground"}`}>Available also for cleaning / housekeeping only</p>
                  <p className={`text-xs mt-0.5 ${cleaningOnly ? "opacity-80" : "text-muted-foreground"}`}>Available for cleaning or housekeeping tasks without childcare responsibilities.</p>
                </div>
              </button>
            </div>

            <Button
              onClick={() => {
                if (selectedTypes.length === 0) {
                  toast({ title: "Select at least one role", description: "Choose the types of care you offer.", variant: "destructive" });
                  return;
                }
                setStep(1);
              }}
              className="w-full rounded-full"
            >
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 1: Location ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Where are you located?</h2>
              <p className="text-muted-foreground text-sm">This helps families find nannies nearby. Your exact address is never shown.</p>
            </div>

            <LocationStep value={locationData} onChange={setLocationData} />

            {/* Work Radius */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-medium text-foreground text-sm mb-1">How far are you willing to travel for a job?</h3>
              <p className="text-xs text-muted-foreground mb-4">Families outside this range won't see your profile by default.</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[10, 20, 30, 40, 60, 100].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setWorkRadius(km)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      workRadius === km
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+41 79 123 45 67"
                  className="pl-10"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-muted-foreground">Your phone number is kept private and used for verification only.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!locationData.city || !locationData.postalCode) {
                    toast({ title: "Location required", description: "Please enter your postal code and city.", variant: "destructive" });
                    return;
                  }
                  if (phoneNumber && !isValidSwissPhone(phoneNumber)) {
                    toast({ title: "Invalid phone number", description: "Please enter a valid Swiss phone number (e.g. +41 79 123 45 67).", variant: "destructive" });
                    return;
                  }
                  setStep(2);
                }}
                className="flex-1 rounded-full"
              >
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Tell Your Story ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Tell Us Your Story</h2>
              <p className="text-muted-foreground text-sm">
                Write or <strong>dictate</strong> your story freely. Our AI will transform your narrative into a polished professional profile.
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">{NARRATIVE_SCRIPT}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
                {([
                  { code: "en-US", label: "EN" },
                  { code: "de-DE", label: "DE" },
                  { code: "fr-FR", label: "FR" },
                  { code: "it-IT", label: "IT" },
                ] as const).map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => { if (isListening) { recognition?.stop(); setIsListening(false); } setSpeechLang(lang.code); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      speechLang === lang.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                onClick={toggleDictation}
                className="rounded-full gap-2"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? "Stop Dictation" : "Start Dictation"}
              </Button>
              {isListening && (
                <span className="text-sm text-destructive animate-pulse font-medium">● Listening...</span>
              )}
            </div>

            <Textarea
              placeholder="Hi, I'm Maria! I'm from Portugal and I speak Portuguese, English, and French. I've been working with children for over 8 years..."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="min-h-[200px] text-sm"
              maxLength={5000}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{narrative.length} / 5,000 characters</span>
              <span>{narrative.length < 100 ? "Minimum 100 characters recommended" : "✓ Good length"}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleGenerateProfile} disabled={aiLoading} className="flex-1 rounded-full">
                {aiLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating your profile...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate My Profile</>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                Skip AI & Enter Manually
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review Profile ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Review Your Profile</h2>
              <p className="text-muted-foreground text-sm">Please review and complete your profile details below.</p>
            </div>

            <div className="space-y-2">
              <Label>Professional Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[120px]" maxLength={3000} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input type="number" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} min="0" max="50" />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Languages (comma-separated)</Label>
                <Input value={languagesStr} onChange={(e) => setLanguagesStr(e.target.value)} maxLength={200} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Education</Label>
                <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. BA in Early Childhood Education" maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Smoking Status</Label>
                <Select value={smokingStatus} onValueChange={setSmokingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_smoker">Non-Smoker</SelectItem>
                    <SelectItem value="smoker">Smoker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Experience */}
            <div>
              <Label className="mb-3 block">Age Groups Experience</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Infants (0-1)", state: expInfants, set: setExpInfants },
                  { label: "Toddlers (1-3)", state: expToddlers, set: setExpToddlers },
                  { label: "Preschool / Early Childhood (3-5)", state: expPreschool, set: setExpPreschool },
                  { label: "School Age (5-12)", state: expSchoolAge, set: setExpSchoolAge },
                  { label: "Teenagers (12+)", state: expTeenagers, set: setExpTeenagers },
                  { label: "Special Needs", state: expSpecialNeeds, set: setExpSpecialNeeds },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={item.state} onCheckedChange={(c) => item.set(!!c)} />
                    {item.label}
                  </label>
                ))}
              </div>
              {expSpecialNeeds && (
                <div className="mt-3 space-y-2">
                  <Label>Special Needs Details</Label>
                  <Input value={specialNeedsDetails} onChange={(e) => setSpecialNeedsDetails(e.target.value)} placeholder="e.g. autism, ADHD, physical disabilities..." maxLength={300} />
                </div>
              )}
            </div>

            {/* Certifications */}
            <div>
              <Label className="mb-3 block">Certifications</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "First Aid", state: certFirstAid, set: setCertFirstAid },
                  { label: "CPR", state: certCpr, set: setCertCpr },
                  { label: "Early Childhood", state: certEarlyChild, set: setCertEarlyChild },
                  { label: "Child Psychology", state: certPsychology, set: setCertPsychology },
                  { label: "Nutrition", state: certNutrition, set: setCertNutrition },
                  { label: "Montessori", state: certMontessori, set: setCertMontessori },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={item.state} onCheckedChange={(c) => item.set(!!c)} />
                    {item.label}
                  </label>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Label>Other Certifications (comma-separated)</Label>
                <Input value={otherCertsStr} onChange={(e) => setOtherCertsStr(e.target.value)} placeholder="e.g. Swimming instructor, Music therapy" maxLength={500} />
              </div>
            </div>

            {/* Services */}
            <div>
              <Label className="mb-3 block">Services Offered</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Date-Night Sitting", state: offDateNight, set: setOffDateNight },
                  { label: "Overnight Care", state: offOvernight, set: setOffOvernight },
                  { label: "After-School", state: offAfterSchool, set: setOffAfterSchool },
                  { label: "Weekend & Holiday", state: offWeekend, set: setOffWeekend },
                  { label: "Full-Time", state: offFullTime, set: setOffFullTime },
                  { label: "Part-Time", state: offPartTime, set: setOffPartTime },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={item.state} onCheckedChange={(c) => item.set(!!c)} />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Skills */}
            <div>
              <Label className="mb-3 block">Additional Skills</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Cooking for Kids", state: canCook, set: setCanCook },
                  { label: "Can Drive", state: canDrive, set: setCanDrive },
                  { label: "Has Own Car", state: hasCar, set: setHasCar },
                  { label: "Driver's License", state: hasDriversLicense, set: setHasDriversLicense },
                  { label: "Homework Help", state: canHomework, set: setCanHomework },
                  { label: "Light Housekeeping", state: canHousekeeping, set: setCanHousekeeping },
                  { label: "Comfortable with Pets", state: comfortableWithPets, set: setComfortableWithPets },
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={item.state} onCheckedChange={(c) => item.set(!!c)} />
                    {item.label}
                  </label>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Label>Activities (comma-separated)</Label>
                <Input value={activitiesStr} onChange={(e) => setActivitiesStr(e.target.value)} placeholder="e.g. Arts & crafts, Swimming, Music, Outdoor play" maxLength={500} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1 rounded-full">
                Next: Rates & Schedule <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Rates & Availability ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Rates & Schedule</h2>
              <p className="text-muted-foreground text-sm">Set your hourly rates and availability.</p>
            </div>

            {/* Rate guidance */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <p className="text-sm text-foreground font-medium">💡 Rate Guidance</p>
              <p className="text-xs text-muted-foreground mt-1">
                Typical rates on the platform: <strong>CHF 20 – CHF 30 per hour</strong> depending on experience, location, and number of children. This is informational only — you're free to set any rate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="font-medium text-foreground">Babysitting Rate</h3>
                <p className="text-xs text-muted-foreground">Hourly rate for occasional babysitting.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">CHF</span>
                  <Input type="number" step="0.50" min="10" max="60" value={babysittingRate} onChange={(e) => setBabysittingRate(e.target.value)} className="pl-12" placeholder="25.00" />
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="font-medium text-foreground">Part-time Childcare Rate</h3>
                <p className="text-xs text-muted-foreground">Hourly rate for regular weekly childcare.</p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">CHF</span>
                  <Input type="number" step="0.50" min="10" max="60" value={partTimeRate} onChange={(e) => setPartTimeRate(e.target.value)} className="pl-12" placeholder="22.00" />
                </div>
              </div>
            </div>

            {/* School Holidays */}
            <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground text-sm">Available during school holidays?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This appears on your profile for families searching during holiday periods.</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant={schoolHolidays ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSchoolHolidays(true)}
                  className="rounded-full"
                >
                  Yes
                </Button>
                <Button
                  variant={!schoolHolidays ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSchoolHolidays(false)}
                  className="rounded-full"
                >
                  No
                </Button>
              </div>
            </div>

            {/* Availability grid */}
            <div>
              <Label className="mb-3 block">Weekly Availability</Label>
              <p className="text-xs text-muted-foreground mb-4">Click cells to toggle. Click a day or period header to toggle an entire column or row.</p>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-muted-foreground font-medium min-w-[90px]">Period</th>
                        {DAYS.map((d) => (
                          <th key={d.key} className="p-2 text-center min-w-[48px]">
                            <button type="button" onClick={() => toggleColumn(d.key)} className="text-muted-foreground font-medium hover:text-primary transition-colors cursor-pointer">
                              {d.label}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map((period) => (
                        <tr key={period.key} className="border-b border-border last:border-0">
                          <td className="p-2 cursor-pointer hover:bg-muted/50 transition-colors rounded" onClick={() => toggleRow(period.key)}>
                            <div className="font-medium text-foreground">{period.label}</div>
                            <div className="text-muted-foreground text-[10px]">{period.time}</div>
                          </td>
                          {DAYS.map((day) => {
                            const key = `${day.key}_${period.key}` as SlotKey;
                            const active = availSlots.has(key);
                            return (
                              <td key={day.key} className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSlot(day.key, period.key)}
                                  className={`w-8 h-8 rounded-md transition-colors ${
                                    active
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                  }`}
                                >
                                  {active ? "✓" : ""}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Availability Notes</Label>
              <Textarea value={availNotes} onChange={(e) => setAvailNotes(e.target.value)} placeholder="e.g. Available mornings only on weekdays, flexible on weekends..." className="min-h-[80px]" maxLength={500} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(5)} className="flex-1 rounded-full">
                Next: Profile Photo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Profile Photo ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Upload Your Profile Photo</h2>
              <p className="text-muted-foreground text-sm">A clear, well-lit photo of your face helps families trust you. This will be your main profile picture.</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mb-4">
                <p className="text-xs text-foreground font-medium">📸 Photo Tips</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• Face clearly visible and well-lit</li>
                  <li>• Use a real photo (not a cartoon or avatar)</li>
                  <li>• Friendly, approachable expression</li>
                  <li>• Plain or simple background</li>
                </ul>
              </div>

              {profilePhoto ? (
                <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-primary">
                  <img src={profilePhoto.preview} alt="Profile" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setProfilePhoto(null)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-48 h-48 mx-auto rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setProfilePhoto({ file, preview: URL.createObjectURL(file) });
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(4)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!profilePhoto) {
                    toast({ title: "Photo required", description: "Please upload a profile photo.", variant: "destructive" });
                    return;
                  }
                  setStep(6);
                }}
                className="flex-1 rounded-full"
              >
                Next: Media & Docs <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Media & Documents ── */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Additional Photos & Media</h2>
              <p className="text-muted-foreground text-sm">Add more photos and optionally record a video or voice introduction.</p>
            </div>

            {/* Additional Photos */}
            <div>
              <h3 className="font-medium text-foreground mb-3">Additional Photos</h3>
              <p className="text-xs text-muted-foreground mb-3">Upload up to 10 additional photos showing you with children, activities, etc.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={p.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Video & Voice */}
            <div>
              <h3 className="font-medium text-foreground mb-3">Video & Voice Introductions</h3>
              <p className="text-xs text-muted-foreground mb-3">Optional but highly recommended — families love seeing and hearing from you!</p>
              <MediaIntroRecorder
                videoUrl={videoIntroUrl}
                voiceUrl={voiceIntroUrl}
                onVideoChange={setVideoIntroUrl}
                onVoiceChange={setVoiceIntroUrl}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(5)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(7)} className="flex-1 rounded-full">
                Next: Verification <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 7: Certificates & Visibility ── */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Certificates & Profile Visibility</h2>
              <p className="text-muted-foreground text-sm">Upload professional certificates and choose who can see your profile.</p>
            </div>

            {/* Certificate Upload */}
            <CertificateUpload existingCertificates={certificates} onUploaded={() => {}} />

            {/* Profile Visibility */}
            <div className="pt-2">
              <ProfileVisibilitySelector value={profileVisibility} onChange={setProfileVisibility} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(6)} className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 rounded-full"
                data-testid="complete-profile-btn"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Complete Profile</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* DIDIT Verification Popup — shown after profile save */}
        <DiditVerificationPopup
          open={showDiditPopup}
          onOpenChange={(open) => {
            if (!open) navigate("/dashboard");
            setShowDiditPopup(open);
          }}
          onVerifyLater={() => navigate("/dashboard")}
        />
      </main>
    </div>
  );
};

export default NannyOnboarding;
