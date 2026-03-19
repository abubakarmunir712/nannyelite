import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Trash2, Eye, Plus, CalendarIcon, Building2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "babysitting", label: "Babysitting" },
  { value: "part_time", label: "Part-Time Nanny" },
  { value: "full_time", label: "Full-Time Nanny" },
  { value: "after_school", label: "After-School Care" },
  { value: "date_night", label: "Date-Night" },
  { value: "overnight", label: "Overnight" },
  { value: "weekend_holiday", label: "Weekend & Holiday" },
];

const AdminJobs = () => {
  const { isAdmin } = useAdminRole();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editJob, setEditJob] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [schedule, setSchedule] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [numberOfChildren, setNumberOfChildren] = useState("1");
  const [childrenAges, setChildrenAges] = useState("");
  const [requirements, setRequirements] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isPlatformJob, setIsPlatformJob] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job deleted" });
      fetchJobs();
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setServiceType(""); setLocation("");
    setSchedule(""); setHourlyRate(""); setNumberOfChildren("1"); setChildrenAges("");
    setRequirements(""); setStartDate(undefined); setEndDate(undefined);
    setIsPlatformJob(true); setContactName(""); setContactEmail(""); setContactPhone("");
  };

  const openEditJob = (job: any) => {
    setEditJob({ ...job });
    setEditOpen(true);
  };

  const handleUpdateJob = async () => {
    if (!editJob) return;
    setSubmitting(true);
    const { error } = await supabase.from("jobs").update({
      title: editJob.title,
      description: editJob.description || null,
      service_type: editJob.service_type,
      location: editJob.location || null,
      schedule: editJob.schedule || null,
      hourly_rate: editJob.hourly_rate ? parseFloat(editJob.hourly_rate) : null,
      number_of_children: editJob.number_of_children || 1,
      children_ages: editJob.children_ages || null,
      requirements: editJob.requirements || null,
      status: editJob.status,
      contact_name: editJob.contact_name || null,
      contact_email: editJob.contact_email || null,
      contact_phone: editJob.contact_phone || null,
    }).eq("id", editJob.id);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job updated" });
      setEditOpen(false);
      fetchJobs();
    }
  };

  const handleCreateJob = async () => {
    if (!user || !title.trim() || !serviceType) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const jobData: any = {
      title: title.trim(),
      description: description.trim() || null,
      service_type: serviceType,
      location: location.trim() || null,
      schedule: schedule.trim() || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      number_of_children: parseInt(numberOfChildren) || 1,
      children_ages: childrenAges.trim() || null,
      requirements: requirements.trim() || null,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      job_source: isPlatformJob ? "platform" : "family",
      family_user_id: isPlatformJob ? null : user.id,
      contact_name: isPlatformJob ? (contactName.trim() || null) : null,
      contact_email: isPlatformJob ? (contactEmail.trim() || null) : null,
      contact_phone: isPlatformJob ? (contactPhone.trim() || null) : null,
    };

    const { error } = await supabase.from("jobs").insert(jobData);
    setSubmitting(false);

    if (error) {
      toast({ title: "Failed to create job", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job created successfully!" });
      resetForm();
      setOpen(false);
      fetchJobs();
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading jobs...</p>;

  return (
    <div className="space-y-4">
      {/* Create Platform Job button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2">
                <Plus className="h-4 w-4" /> Add Platform Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Create Job Listing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Job Source Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Platform-added job</Label>
                  </div>
                  <Switch checked={isPlatformJob} onCheckedChange={setIsPlatformJob} />
                </div>

                {/* Platform contact fields */}
                {isPlatformJob && (
                  <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">Family contact details (admin-only, not shown publicly)</p>
                    <div>
                      <Label htmlFor="contact-name">Contact Name</Label>
                      <Input id="contact-name" placeholder="e.g. Marie Dupont" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={100} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input id="contact-email" type="email" placeholder="email@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={200} />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Phone</Label>
                        <Input id="contact-phone" type="tel" placeholder="+41 79..." value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={30} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="job-title">Job Title *</Label>
                  <Input id="job-title" placeholder="e.g. After-school nanny for 2 kids in Lausanne" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                </div>

                <div>
                  <Label>Service Type *</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="job-desc">Description</Label>
                  <Textarea id="job-desc" placeholder="Describe the role..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="job-loc">Location</Label>
                    <Input id="job-loc" placeholder="e.g. Lausanne" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="job-rate">Hourly Rate (CHF)</Label>
                    <Input id="job-rate" type="number" min="0" step="0.50" placeholder="28" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="job-schedule">Schedule</Label>
                  <Input id="job-schedule" placeholder="e.g. Mon-Fri 15:00-18:00" value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={200} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(d) => startDate ? d < startDate : false} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="job-children">Number of Children</Label>
                    <Input id="job-children" type="number" min="1" max="10" value={numberOfChildren} onChange={(e) => setNumberOfChildren(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="job-ages">Children's Ages</Label>
                    <Input id="job-ages" placeholder="e.g. 3 and 6" value={childrenAges} onChange={(e) => setChildrenAges(e.target.value)} maxLength={100} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="job-req">Requirements</Label>
                  <Textarea id="job-req" placeholder="e.g. First aid certified, speaks French..." value={requirements} onChange={(e) => setRequirements(e.target.value)} maxLength={1000} rows={2} />
                </div>

                <Button onClick={handleCreateJob} disabled={submitting} className="w-full">
                  {submitting ? "Creating..." : "Create Job"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No jobs posted yet</TableCell></TableRow>
            )}
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{j.title}</TableCell>
                <TableCell>
                  {j.is_seeded === false ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold">R</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold">S</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {j.job_source || "family"}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant="outline">{j.service_type}</Badge></TableCell>
                <TableCell className="text-sm">{j.location || "—"}</TableCell>
                <TableCell className="text-sm">{j.hourly_rate ? `${j.currency || "CHF"} ${j.hourly_rate}/hr` : "—"}</TableCell>
                <TableCell><Badge variant={j.status === "open" ? "default" : "secondary"}>{j.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link to={`/jobs/${j.id}`}>
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                    </Link>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditJob(j)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteJob(j.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Job Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Job</DialogTitle>
          </DialogHeader>
          {editJob && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={editJob.title} onChange={(e) => setEditJob({ ...editJob, title: e.target.value })} />
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={editJob.service_type} onValueChange={(v) => setEditJob({ ...editJob, service_type: v })}>
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
                <Textarea value={editJob.description || ""} onChange={(e) => setEditJob({ ...editJob, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input value={editJob.location || ""} onChange={(e) => setEditJob({ ...editJob, location: e.target.value })} />
                </div>
                <div>
                  <Label>Hourly Rate (CHF)</Label>
                  <Input type="number" value={editJob.hourly_rate || ""} onChange={(e) => setEditJob({ ...editJob, hourly_rate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Schedule</Label>
                <Input value={editJob.schedule || ""} onChange={(e) => setEditJob({ ...editJob, schedule: e.target.value })} />
              </div>
              <div>
                <Label>Requirements</Label>
                <Textarea value={editJob.requirements || ""} onChange={(e) => setEditJob({ ...editJob, requirements: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Children</Label>
                  <Input type="number" min="1" value={editJob.number_of_children || 1} onChange={(e) => setEditJob({ ...editJob, number_of_children: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Children Ages</Label>
                  <Input value={editJob.children_ages || ""} onChange={(e) => setEditJob({ ...editJob, children_ages: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editJob.status} onValueChange={(v) => setEditJob({ ...editJob, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editJob.job_source === "platform" && (
                <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">Contact Details</p>
                  <Input placeholder="Contact Name" value={editJob.contact_name || ""} onChange={(e) => setEditJob({ ...editJob, contact_name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Email" value={editJob.contact_email || ""} onChange={(e) => setEditJob({ ...editJob, contact_email: e.target.value })} />
                    <Input placeholder="Phone" value={editJob.contact_phone || ""} onChange={(e) => setEditJob({ ...editJob, contact_phone: e.target.value })} />
                  </div>
                </div>
              )}
              <Button onClick={handleUpdateJob} disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobs;
