import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, EyeOff, User, MapPin, Clock, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminProfileReview from "./AdminProfileReview";
import AdminFamilyDetail from "./AdminFamilyDetail";

const AdminProfiles = () => {
  const navigate = useNavigate();
  const [nannyProfiles, setNannyProfiles] = useState<any[]>([]);
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [viewFamilyUserId, setViewFamilyUserId] = useState<string | null>(null);

  // Family edit state
  const [editFamily, setEditFamily] = useState<any>(null);
  const [editFamilyProfile, setEditFamilyProfile] = useState<any>(null);
  const [savingFamily, setSavingFamily] = useState(false);

  const fetchData = async () => {
    // Fetch nanny_profiles (should work), family data from profiles table (RLS blocks family_profiles)
    const [{ data: nannies }, { data: familiesFromProfiles }, { data: profiles }, { data: nannyPhotos }] = await Promise.all([
      supabase.from("nanny_profiles").select("*").order("created_at", { ascending: false }),
      // Use profiles table with role='family' since family_profiles is blocked by RLS
      supabase.from("profiles").select("user_id, full_name, email, location, phone, created_at").eq("role", "family").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, email, location, phone, languages"),
      supabase.from("nanny_photos").select("user_id, photo_url").eq("is_primary", true),
    ]);

    // Also try to get family_profiles data (might work with proper RLS)
    const { data: familyProfilesData } = await supabase
      .from("family_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const statusOrder: Record<string, number> = { pending: 0, rejected: 1, approved: 2 };
    const sorted = (nannies || []).sort((a, b) => {
      const aOrder = statusOrder[a.profile_status] ?? 1;
      const bOrder = statusOrder[b.profile_status] ?? 1;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setNannyProfiles(sorted);
    
    // Use family_profiles if available, otherwise construct from profiles table
    if (familyProfilesData && familyProfilesData.length > 0) {
      setFamilyProfiles(familyProfilesData);
    } else {
      // Construct family profiles from profiles table data
      const constructedFamilies = (familiesFromProfiles || []).map((p: any) => ({
        user_id: p.user_id,
        city: p.location?.split(',')[0] || '',
        created_at: p.created_at,
        // Add placeholder fields
        onboarding_completed: true,
        number_of_children: null,
        children_ages: null,
      }));
      setFamilyProfiles(constructedFamilies);
    }

    const map: Record<string, any> = {};
    (profiles || []).forEach((p: any) => {
      map[p.user_id] = { name: p.full_name || p.email || "Unknown", location: p.location, email: p.email, phone: p.phone, languages: p.languages };
    });
    // Also add families from profiles query
    (familiesFromProfiles || []).forEach((p: any) => {
      if (!map[p.user_id]) {
        map[p.user_id] = { name: p.full_name || p.email || "Unknown", location: p.location, email: p.email, phone: p.phone };
      }
    });
    setProfileNames(map);

    const photoMap: Record<string, string> = {};
    (nannyPhotos || []).forEach((p: any) => {
      photoMap[p.user_id] = p.photo_url;
    });
    setPhotos(photoMap);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openFamilyEdit = (fp: any) => {
    const info = profileNames[fp.user_id] || {};
    setEditFamily(fp);
    setEditFamilyProfile({
      full_name: info.name || "",
      email: info.email || "",
      phone: info.phone || "",
      city: fp.city || "",
      postal_code: fp.postal_code || "",
      address: fp.address || "",
      household_description: fp.household_description || "",
      pets_description: fp.pets_description || "",
      special_requirements: fp.special_requirements || "",
    });
  };

  const saveFamilyEdit = async () => {
    if (!editFamily) return;
    setSavingFamily(true);

    const [profileRes, familyRes] = await Promise.all([
      supabase.from("profiles").update({
        full_name: editFamilyProfile.full_name.trim() || null,
        phone: editFamilyProfile.phone.trim() || null,
      }).eq("user_id", editFamily.user_id),
      supabase.from("family_profiles").update({
        city: editFamilyProfile.city.trim() || null,
        postal_code: editFamilyProfile.postal_code.trim() || null,
        address: editFamilyProfile.address.trim() || null,
        household_description: editFamilyProfile.household_description.trim() || null,
        pets_description: editFamilyProfile.pets_description.trim() || null,
        special_requirements: editFamilyProfile.special_requirements.trim() || null,
      }).eq("user_id", editFamily.user_id),
    ]);

    const error = profileRes.error || familyRes.error;
    setSavingFamily(false);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Family profile updated" });
      setEditFamily(null);
      fetchData();
    }
  };

  /** Delete all data related to a user across all tables */
  const deleteAllUserData = async (userId: string) => {
    // First, get conversation IDs to delete messages
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`);
    const convoIds = convos?.map(c => c.id) || [];

    // Delete messages from those conversations
    if (convoIds.length > 0) {
      await supabase.from("messages").delete().in("conversation_id", convoIds);
    }

    // Delete all related records in parallel (order doesn't matter, no FK cascades)
    await Promise.all([
      supabase.from("conversations").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("bookings").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("payments").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("favorite_nannies").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("nanny_references").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("nanny_self_references").delete().eq("user_id", userId),
      supabase.from("nanny_photos").delete().eq("user_id", userId),
      supabase.from("nanny_documents").delete().eq("user_id", userId),
      supabase.from("user_certificates").delete().eq("user_id", userId),
      supabase.from("job_applications").delete().eq("nanny_user_id", userId),
      supabase.from("notifications").delete().eq("user_id", userId),
      supabase.from("activity_log").delete().eq("user_id", userId),
      supabase.from("availability_slots").delete().eq("user_id", userId),
      supabase.from("children").delete().eq("family_user_id", userId),
      supabase.from("jobs").delete().eq("family_user_id", userId),
    ]);

    // Delete profile-level records last
    await Promise.all([
      supabase.from("nanny_profiles").delete().eq("user_id", userId),
      supabase.from("family_profiles").delete().eq("user_id", userId),
    ]);

    // Delete user_roles and profiles last
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
  };

  const deleteNannyProfile = async (userId: string, name: string) => {
    try {
      await deleteAllUserData(userId);
      toast({ title: "Success", description: `Nanny profile for ${name} deleted` });
      fetchData();
    } catch (err: any) {
      console.error("[Admin Delete] Exception:", err);
      toast({ title: "Delete failed", description: err.message || "Unknown error", variant: "destructive" });
    }
  };

  const deleteFamilyProfile = async (userId: string, name: string) => {
    try {
      await deleteAllUserData(userId);
      toast({ title: "Success", description: `Family profile for ${name} deleted` });
      fetchData();
    } catch (err: any) {
      console.error("[Admin Delete] Exception:", err);
      toast({ title: "Delete failed", description: err.message || "Unknown error", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge variant="default" className="bg-emerald-600">✅ Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">❌ Rejected</Badge>;
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">⏳ Pending</Badge>;
  };

  // Data type badge based on is_seeded database field
  const dataTypeBadge = (isSeeded: boolean | undefined | null) => {
    if (isSeeded === false) {
      return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold">R</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold">S</Badge>;
  };

  const pendingCount = nannyProfiles.filter((n) => n.profile_status === "pending" && n.onboarding_completed).length;

  if (loading) return <p className="text-muted-foreground">Loading profiles...</p>;

  if (reviewUserId) {
    return <AdminProfileReview nannyUserId={reviewUserId} onBack={() => { setReviewUserId(null); fetchData(); }} />;
  }

  if (viewFamilyUserId) {
    return <AdminFamilyDetail familyUserId={viewFamilyUserId} onBack={() => { setViewFamilyUserId(null); fetchData(); }} />;
  }

  return (
    <>
      <Tabs defaultValue="nannies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="nannies">
            Nanny Profiles
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="families">Family Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="nannies">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nanny</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nannyProfiles.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No nanny profiles yet</TableCell></TableRow>
                )}
                {nannyProfiles.map((np) => {
                  const info = profileNames[np.user_id] || { name: np.user_id.slice(0, 8), location: null };
                  const photo = photos[np.user_id];
                  const isPending = np.profile_status === "pending" && np.onboarding_completed;
                  return (
                    <TableRow key={np.id} className={isPending ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {photo ? (
                            <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm">{info.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dataTypeBadge(np.is_seeded)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {info.location || (np.latitude ? "📍 Set" : "—")}
                      </TableCell>
                      <TableCell className="text-sm">{np.years_of_experience || 0} yrs</TableCell>
                      <TableCell>{statusBadge(np.profile_status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(np.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewUserId(np.user_id)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" /> Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/nanny/${np.user_id}`)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="gap-1">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete nanny profile?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the nanny profile for <strong>{info.name}</strong>. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteNannyProfile(np.user_id, info.name)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="families">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyProfiles.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No family profiles yet</TableCell></TableRow>
                )}
                {familyProfiles.map((fp) => {
                  const info = profileNames[fp.user_id] || {};
                  return (
                    <TableRow key={fp.id || fp.user_id}>
                      <TableCell className="font-medium">{info.name || fp.user_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        {dataTypeBadge(fp.is_seeded)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{info.email || "—"}</TableCell>
                      <TableCell className="text-sm">{fp.city || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={fp.onboarding_completed ? "default" : "outline"}>
                          {fp.onboarding_completed ? "Complete" : "Incomplete"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(fp.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewFamilyUserId(fp.user_id)}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => openFamilyEdit(fp)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="gap-1">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete family profile?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the family profile for <strong>{info.name || fp.user_id.slice(0, 8)}</strong>. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteFamilyProfile(fp.user_id, info.name || fp.user_id.slice(0, 8))}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Family Edit Dialog */}
      <Dialog open={!!editFamily} onOpenChange={(v) => !v && setEditFamily(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Family Profile</DialogTitle>
          </DialogHeader>
          {editFamilyProfile && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Full Name</Label>
                <Input value={editFamilyProfile.full_name} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editFamilyProfile.phone} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={editFamilyProfile.city} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, city: e.target.value })} />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input value={editFamilyProfile.postal_code} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, postal_code: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={editFamilyProfile.address} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, address: e.target.value })} />
              </div>
              <div>
                <Label>Household Description</Label>
                <Textarea value={editFamilyProfile.household_description} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, household_description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Pets</Label>
                <Input value={editFamilyProfile.pets_description} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, pets_description: e.target.value })} />
              </div>
              <div>
                <Label>Special Requirements</Label>
                <Textarea value={editFamilyProfile.special_requirements} onChange={(e) => setEditFamilyProfile({ ...editFamilyProfile, special_requirements: e.target.value })} rows={2} />
              </div>
              <Button onClick={saveFamilyEdit} disabled={savingFamily} className="w-full">
                {savingFamily ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminProfiles;
