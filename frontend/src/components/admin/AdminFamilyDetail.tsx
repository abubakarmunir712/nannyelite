import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, MapPin, Baby, Briefcase, CalendarDays, Home, PawPrint, AlertCircle, Trash2, MessageCircle, Pencil, Save, X, ExternalLink } from "lucide-react";
import LocationInput, { type LocationData } from "@/components/LocationInput";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Props {
  familyUserId: string;
  onBack: () => void;
}

const AdminFamilyDetail = ({ familyUserId, onBack }: Props) => {
  const [profile, setProfile] = useState<any>(null);
  const [familyProfile, setFamilyProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [nannyNames, setNannyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Inline editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    household_description: "",
    pets_description: "",
    special_requirements: "",
  });
  const [locationData, setLocationData] = useState<LocationData>({
    postalCode: "",
    city: "",
    state: "",
    country: "Switzerland",
    latitude: null,
    longitude: null,
  });

  // Expanded job detail
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [profileRes, familyRes, childrenRes, jobsRes, bookingsRes, convoRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", familyUserId).single(),
        supabase.from("family_profiles").select("*").eq("user_id", familyUserId).single(),
        supabase.from("children").select("*").eq("family_user_id", familyUserId).order("birth_year"),
        supabase.from("jobs").select("*").eq("family_user_id", familyUserId).order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").eq("family_user_id", familyUserId).order("created_at", { ascending: false }),
        supabase.from("conversations").select("*").eq("family_user_id", familyUserId).order("last_message_at", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setFamilyProfile(familyRes.data);
      setChildren(childrenRes.data || []);
      setJobs(jobsRes.data || []);
      setBookings(bookingsRes.data || []);
      setConversations(convoRes.data || []);

      // Populate edit form
      if (profileRes.data || familyRes.data) {
        setEditForm({
          full_name: profileRes.data?.full_name || "",
          phone: profileRes.data?.phone || "",
          address: familyRes.data?.address || "",
          household_description: familyRes.data?.household_description || "",
          pets_description: familyRes.data?.pets_description || "",
          special_requirements: familyRes.data?.special_requirements || "",
        });
        setLocationData({
          postalCode: familyRes.data?.postal_code || "",
          city: familyRes.data?.city || "",
          state: familyRes.data?.state || "",
          country: familyRes.data?.country || "Switzerland",
          latitude: familyRes.data?.latitude ?? null,
          longitude: familyRes.data?.longitude ?? null,
        });
      }

      // Fetch nanny names for bookings + conversations
      const nannyIds = [...new Set([
        ...(bookingsRes.data || []).map((b: any) => b.nanny_user_id),
        ...(convoRes.data || []).map((c: any) => c.nanny_user_id),
      ])];
      if (nannyIds.length > 0) {
        const { data: nannyProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", nannyIds);
        const map: Record<string, string> = {};
        (nannyProfiles || []).forEach((p: any) => {
          map[p.user_id] = p.full_name || p.email || p.user_id.slice(0, 8);
        });
        setNannyNames(map);
      }

      setLoading(false);
    };
    fetch();
  }, [familyUserId]);

  const deleteProfile = async () => {
    const { error: fpErr } = await supabase.from("family_profiles").delete().eq("user_id", familyUserId);
    if (fpErr) {
      toast({ title: "Error deleting family profile", description: fpErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Family profile deleted" });
    onBack();
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) {
      toast({ title: "Error deleting job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job deleted" });
      setJobs(jobs.filter(j => j.id !== jobId));
    }
  };

  const deleteChild = async (childId: string) => {
    const { error } = await supabase.from("children").delete().eq("id", childId);
    if (error) {
      toast({ title: "Error deleting child", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Child record deleted" });
      setChildren(children.filter(c => c.id !== childId));
    }
  };

  const saveProfileEdit = async () => {
    const { full_name, phone, address, household_description, pets_description, special_requirements } = editForm;
    const { postalCode, city, state, country, latitude, longitude } = locationData;

    const [profileRes, familyRes] = await Promise.all([
      supabase.from("profiles").update({ full_name, phone }).eq("user_id", familyUserId),
      supabase.from("family_profiles").update({
        address, postal_code: postalCode, city, state, country, latitude, longitude,
        household_description, pets_description, special_requirements,
      }).eq("user_id", familyUserId),
    ]);

    if (profileRes.error || familyRes.error) {
      toast({ title: "Error saving changes", description: profileRes.error?.message || familyRes.error?.message, variant: "destructive" });
      return;
    }

    setProfile((prev: any) => ({ ...prev, full_name, phone }));
    setFamilyProfile((prev: any) => ({ ...prev, address, postal_code: postalCode, city, state, country, latitude, longitude, household_description, pets_description, special_requirements }));
    setEditingProfile(false);
    toast({ title: "Profile updated" });
  };

  if (loading) return <p className="text-muted-foreground">Loading family details...</p>;
  if (!profile) return <p className="text-destructive">Profile not found.</p>;

  const currentYear = new Date().getFullYear();

  const jobStatusBadge = (status: string) => {
    if (status === "open") return <Badge className="bg-emerald-600">Open</Badge>;
    if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
    if (status === "filled") return <Badge variant="outline">Filled</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const bookingStatusBadge = (status: string) => {
    if (status === "confirmed") return <Badge className="bg-emerald-600">Confirmed</Badge>;
    if (status === "pending") return <Badge className="bg-amber-500">Pending</Badge>;
    if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
    if (status === "completed") return <Badge variant="outline">Completed</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-display font-semibold">
            Family: {profile.full_name || profile.email || "Unknown"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!editingProfile && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingProfile(true)}>
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-4 w-4" /> Delete Family Profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this family profile?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the family profile for <strong>{profile.full_name || profile.email}</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteProfile}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Profile Info — View or Edit mode */}
      {editingProfile ? (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Edit Family Profile</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={saveProfileEdit}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <LocationInput value={locationData} onChange={setLocationData} />
            </div>
            <div className="space-y-3">
              <div>
                <Label>Household Description</Label>
                <Textarea value={editForm.household_description} onChange={e => setEditForm(f => ({ ...f, household_description: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Pets</Label>
                <Input value={editForm.pets_description} onChange={e => setEditForm(f => ({ ...f, pets_description: e.target.value }))} />
              </div>
              <div>
                <Label>Special Requirements</Label>
                <Textarea value={editForm.special_requirements} onChange={e => setEditForm(f => ({ ...f, special_requirements: e.target.value }))} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{[familyProfile?.address, familyProfile?.postal_code, familyProfile?.city].filter(Boolean).join(", ") || profile.location || "—"}</span>
              </div>
              {profile.languages?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground text-xs">Languages:</span>
                  {profile.languages.map((l: string) => (
                    <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Household</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{familyProfile?.household_description || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <PawPrint className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{familyProfile?.pets_description || "No pets info"}</span>
              </div>
              {familyProfile?.special_requirements && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{familyProfile.special_requirements}</span>
                </div>
              )}
              <div className="pt-1">
                <Badge variant={familyProfile?.onboarding_completed ? "default" : "outline"}>
                  {familyProfile?.onboarding_completed ? "Onboarding Complete" : "Onboarding Incomplete"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Children */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Baby className="h-4 w-4" /> Children ({children.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No children registered.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {children.map((c) => (
                <div key={c.id} className="border rounded-md p-3 text-sm space-y-1 relative group">
                  <p className="font-medium">{c.name || "Unnamed"}</p>
                  <p className="text-muted-foreground">Born {c.birth_year} (age ~{currentYear - c.birth_year})</p>
                  {c.gender && c.gender !== "not_specified" && (
                    <p className="text-muted-foreground capitalize">{c.gender}</p>
                  )}
                  {c.notes && <p className="text-xs text-muted-foreground italic">{c.notes}</p>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete child record?</AlertDialogTitle>
                        <AlertDialogDescription>Remove {c.name || "this child"} from the family profile.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteChild(c.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Postings — Clickable with expandable detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Job Postings ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs posted.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="border rounded-md overflow-hidden">
                  {/* Job summary row — clickable */}
                  <button
                    className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setExpandedJobId(expandedJobId === j.id ? null : j.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium truncate max-w-[200px]">{j.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{j.service_type}</Badge>
                      {jobStatusBadge(j.status)}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                      <span>{j.location || "—"}</span>
                      <span>{j.hourly_rate ? `${j.currency || "CHF"} ${j.hourly_rate}/hr` : "—"}</span>
                      <span className="text-xs">{new Date(j.created_at).toLocaleDateString()}</span>
                      <a
                        href={`/jobs/${j.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <span
                            role="button"
                            className="text-destructive hover:text-destructive/80 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </span>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                            <AlertDialogDescription>Permanently delete "{j.title}". This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteJob(j.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </button>

                  {/* Expanded job detail */}
                  {expandedJobId === j.id && (
                    <div className="border-t bg-muted/30 p-4 text-sm space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {j.description && (
                            <div>
                              <span className="font-medium text-muted-foreground">Description:</span>
                              <p className="mt-1">{j.description}</p>
                            </div>
                          )}
                          {j.requirements && (
                            <div>
                              <span className="font-medium text-muted-foreground">Requirements:</span>
                              <p className="mt-1">{j.requirements}</p>
                            </div>
                          )}
                          {j.schedule && (
                            <div>
                              <span className="font-medium text-muted-foreground">Schedule:</span>
                              <p className="mt-1">{j.schedule}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Baby className="h-4 w-4 text-muted-foreground" />
                            <span>{j.number_of_children || "—"} child(ren)</span>
                            {j.children_ages && <span className="text-muted-foreground">({j.children_ages})</span>}
                          </div>
                          {(j.start_date || j.end_date) && (
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {j.start_date ? new Date(j.start_date).toLocaleDateString() : "—"}
                                {" → "}
                                {j.end_date ? new Date(j.end_date).toLocaleDateString() : "Ongoing"}
                              </span>
                            </div>
                          )}
                          {j.contact_name && (
                            <div>
                              <span className="font-medium text-muted-foreground">Contact:</span>
                              <span className="ml-1">{j.contact_name}</span>
                              {j.contact_email && <span className="ml-2 text-muted-foreground">{j.contact_email}</span>}
                              {j.contact_phone && <span className="ml-2 text-muted-foreground">{j.contact_phone}</span>}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-muted-foreground">Source:</span>
                            <Badge variant="outline" className="ml-2 text-xs">{j.job_source}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <a href={`/jobs/${j.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="h-3 w-3" /> Open Full Job Page
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Bookings ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Nanny</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm">{new Date(b.booking_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm font-medium">{nannyNames[b.nanny_user_id] || b.nanny_user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{b.service_type || "—"}</TableCell>
                      <TableCell className="text-sm">{b.hourly_rate ? `CHF ${b.hourly_rate}/hr` : "—"}</TableCell>
                      <TableCell>{bookingStatusBadge(b.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Conversations ({conversations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div>
                    <span className="font-medium">{nannyNames[c.nanny_user_id] || c.nanny_user_id.slice(0, 8)}</span>
                    <span className="text-muted-foreground ml-2">
                      Last message: {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFamilyDetail;
