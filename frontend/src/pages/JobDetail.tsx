import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, MapPin, Clock, Baby, Banknote, CalendarDays,
  CheckCircle2, XCircle, User, Briefcase, Shield, Mail, Phone, Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";

interface Application {
  id: string;
  nanny_user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  nanny_name?: string;
  nanny_avatar?: string | null;
  years_of_experience?: number;
}

interface JobData {
  id: string;
  family_user_id: string | null;
  title: string;
  description: string | null;
  service_type: string;
  location: string | null;
  schedule: string | null;
  hourly_rate: number | null;
  number_of_children: number | null;
  children_ages: string | null;
  requirements: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  job_source?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

const SERVICE_TYPES = [
  { value: "babysitting", label: "Babysitting" },
  { value: "part_time", label: "Part-Time Nanny" },
  { value: "full_time", label: "Full-Time Nanny" },
  { value: "after_school", label: "After-School Care" },
  { value: "date_night", label: "Date-Night" },
  { value: "overnight", label: "Overnight" },
  { value: "weekend_holiday", label: "Weekend & Holiday" },
];

const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_TYPES.map((t) => [t.value, t.label])
);

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-destructive/10 text-destructive",
};

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = job?.family_user_id === user?.id;
  const canEdit = isOwner || isAdmin;

  const openEdit = () => {
    if (!job) return;
    setEditData({ ...job });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from("jobs").update({
      title: editData.title,
      description: editData.description || null,
      service_type: editData.service_type,
      location: editData.location || null,
      schedule: editData.schedule || null,
      hourly_rate: editData.hourly_rate ? parseFloat(editData.hourly_rate) : null,
      number_of_children: editData.number_of_children || 1,
      children_ages: editData.children_ages || null,
      requirements: editData.requirements || null,
      status: editData.status,
    }).eq("id", editData.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job updated" });
      setJob({ ...job!, ...editData });
      setEditOpen(false);
    }
  };

  useEffect(() => {
    if (!user || !id) { navigate("/login"); return; }

    const load = async () => {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (!jobData) {
        navigate("/jobs");
        return;
      }

      // Check access: job owner, admin, or any user viewing an open job
      const isOwner = jobData.family_user_id === user.id;
      const isOpen = jobData.status === "open";
      
      if (!isOwner && !isOpen) {
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
        if (!roleData || roleData.length === 0) {
          navigate("/jobs");
          return;
        }
      }

      setJob(jobData);

      const { data: apps } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false });

      if (apps && apps.length > 0) {
        const nannyIds = apps.map((a) => a.nanny_user_id);
        const [{ data: profiles }, { data: nannyProfiles }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", nannyIds),
          supabase.from("nanny_profiles").select("user_id, years_of_experience").in("user_id", nannyIds),
        ]);

        setApplications(
          apps.map((a) => {
            const prof = profiles?.find((p) => p.user_id === a.nanny_user_id);
            const np = nannyProfiles?.find((p) => p.user_id === a.nanny_user_id);
            return {
              ...a,
              nanny_name: prof?.full_name || "Nanny",
              nanny_avatar: prof?.avatar_url,
              years_of_experience: np?.years_of_experience || 0,
            };
          })
        );
      }

      setLoading(false);
    };

    load();
  }, [user, id, navigate]);

  const updateApplicationStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", appId);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: `Application ${status}` });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Job Details */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h1 className="font-display text-xl font-bold text-foreground">{job.title}</h1>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1" onClick={openEdit}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge className="bg-primary/10 text-primary">
              {SERVICE_LABELS[job.service_type] || job.service_type}
            </Badge>
            {(job.job_source === "platform" || job.job_source === "partner") && (
              <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary">
                <Shield className="h-2.5 w-2.5" /> Shared by NannyElite
              </Badge>
            )}
          </div>

          {job.description && <p className="text-sm text-muted-foreground mb-4">{job.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
            {job.hourly_rate && <span className="flex items-center gap-1"><Banknote className="h-4 w-4" />CHF {Number(job.hourly_rate).toFixed(0)}/hr</span>}
            {job.schedule && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.schedule}</span>}
            {job.number_of_children && <span className="flex items-center gap-1"><Baby className="h-4 w-4" />{job.number_of_children} child{job.number_of_children > 1 ? "ren" : ""}</span>}
            {job.start_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(job.start_date), "MMM d, yyyy")}
                {job.end_date && ` – ${format(new Date(job.end_date), "MMM d, yyyy")}`}
              </span>
            )}
          </div>

          {job.requirements && (
            <p className="text-sm text-muted-foreground mt-3 italic">Requirements: {job.requirements}</p>
          )}
          {/* Admin-only contact info for platform jobs */}
          {(job.job_source === "platform" || job.job_source === "partner") && (job.contact_name || job.contact_email || job.contact_phone) && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Admin-only contact details
              </p>
              <div className="space-y-1 text-sm text-foreground">
                {job.contact_name && <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> {job.contact_name}</p>}
                {job.contact_email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {job.contact_email}</p>}
                {job.contact_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {job.contact_phone}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Applications */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Applications ({applications.length})
        </h2>

        {applications.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No applications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {app.nanny_avatar ? (
                        <img src={app.nanny_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Link to={`/nanny/${app.nanny_user_id}`} className="font-medium text-foreground text-sm hover:underline">
                        {app.nanny_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {app.years_of_experience ? `${app.years_of_experience}y experience · ` : ""}
                        Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge className={STATUS_STYLES[app.status] || "bg-muted text-muted-foreground"}>
                    {app.status}
                  </Badge>
                </div>

                {app.message && (
                  <p className="text-sm text-muted-foreground mt-3 pl-13">{app.message}</p>
                )}

                {app.status === "pending" && (
                  <div className="flex gap-2 mt-3 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      onClick={() => updateApplicationStatus(app.id, "rejected")}
                    >
                      <XCircle className="h-3 w-3" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => updateApplicationStatus(app.id, "accepted")}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Accept
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Job Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Job</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={editData.service_type} onValueChange={(v) => setEditData({ ...editData, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
                </div>
                <div>
                  <Label>Hourly Rate (CHF)</Label>
                  <Input type="number" value={editData.hourly_rate || ""} onChange={(e) => setEditData({ ...editData, hourly_rate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Schedule</Label>
                <Input value={editData.schedule || ""} onChange={(e) => setEditData({ ...editData, schedule: e.target.value })} />
              </div>
              <div>
                <Label>Requirements</Label>
                <Textarea value={editData.requirements || ""} onChange={(e) => setEditData({ ...editData, requirements: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Children</Label>
                  <Input type="number" min="1" value={editData.number_of_children || 1} onChange={(e) => setEditData({ ...editData, number_of_children: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Children Ages</Label>
                  <Input value={editData.children_ages || ""} onChange={(e) => setEditData({ ...editData, children_ages: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveEdit} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
