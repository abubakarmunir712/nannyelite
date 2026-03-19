import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin, Clock, Baby, Search, ArrowLeft, Banknote,
  CalendarDays, Briefcase, Send, CheckCircle2, Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import CreateJobForm from "@/components/CreateJobForm";

interface Job {
  id: string;
  family_user_id: string | null;
  title: string;
  description: string | null;
  service_type: string;
  location: string | null;
  schedule: string | null;
  hourly_rate: number | null;
  currency: string | null;
  number_of_children: number | null;
  children_ages: string | null;
  requirements: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  job_source?: string;
  family_name?: string;
  application_count?: number;
  has_applied?: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  babysitting: "Babysitting",
  part_time: "Part-Time Nanny",
  full_time: "Full-Time Nanny",
  after_school: "After-School Care",
  date_night: "Date-Night",
  overnight: "Overnight",
  weekend_holiday: "Weekend & Holiday",
};

const SERVICE_COLORS: Record<string, string> = {
  babysitting: "bg-primary/10 text-primary",
  part_time: "bg-accent text-accent-foreground",
  full_time: "bg-primary/10 text-primary",
  after_school: "bg-accent text-accent-foreground",
  date_night: "bg-primary/10 text-primary",
  overnight: "bg-accent text-accent-foreground",
  weekend_holiday: "bg-primary/10 text-primary",
};

const truncate = (text: string, wordCount = 10) => {
  const words = text.split(/\s+/);
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(" ") + "…";
};

const JobMarketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [nannyApproved, setNannyApproved] = useState(true);

  // Application dialog state
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const isGuest = !user;

  const fetchJobs = async () => {
    setLoading(true);

    if (user) {
      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(profile?.role || null);

      // Check if nanny is approved
      if (profile?.role === "nanny") {
        const { data: np } = await supabase
          .from("nanny_profiles")
          .select("profile_status")
          .eq("user_id", user.id)
          .single();
        setNannyApproved((np as any)?.profile_status === "approved");
      }
    }

    // Fetch jobs (works for both authenticated and anonymous users)
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!jobsData) { setLoading(false); return; }

    if (isGuest) {
      // Guest: minimal data, no enrichment
      setJobs(jobsData.map((j) => ({
        ...j,
        job_source: (j as any).job_source || "family",
        family_name: undefined,
        application_count: 0,
        has_applied: false,
      })));
      setLoading(false);
      return;
    }

    // Fetch family names for family-posted jobs
    const familyIds = [...new Set(jobsData.filter((j) => j.family_user_id).map((j) => j.family_user_id))];
    const { data: familyProfiles } = familyIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", familyIds)
      : { data: [] };

    // Fetch application counts
    const jobIds = jobsData.map((j) => j.id);
    const { data: applications } = await supabase
      .from("job_applications")
      .select("job_id, nanny_user_id")
      .in("job_id", jobIds);

    const enriched: Job[] = jobsData.map((j) => {
      const family = j.family_user_id ? familyProfiles?.find((p) => p.user_id === j.family_user_id) : null;
      const jobApps = applications?.filter((a) => a.job_id === j.id) || [];
      const isPlatform = (j as any).job_source === "platform" || (j as any).job_source === "partner";
      return {
        ...j,
        job_source: (j as any).job_source || "family",
        family_name: isPlatform ? "NannyElite" : "A Family",
        application_count: jobApps.length,
        has_applied: jobApps.some((a) => a.nanny_user_id === user!.id),
      };
    });

    setJobs(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        (SERVICE_LABELS[j.service_type] || j.service_type).toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  const handleApply = async () => {
    if (!user || !applyJobId) return;
    setApplying(true);

    const { error } = await supabase.from("job_applications").insert({
      job_id: applyJobId,
      nanny_user_id: user.id,
      message: applyMessage.trim() || null,
    });

    setApplying(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "You have already applied to this job", variant: "destructive" });
      } else {
        toast({ title: "Failed to apply", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ 
        title: "Application sent!", 
        description: "Families typically review candidates within 24–48 hours.",
        duration: 5000,
      });
      setApplyJobId(null);
      setApplyMessage("");
      fetchJobs();
    }
  };

  const isFamily = userRole === "family";

  return (
    <div className="min-h-screen bg-secondary">
      <SEO title="Job Marketplace – NannyElite" description="Browse and post childcare jobs in Switzerland. Find babysitting, after-school, and full-time nanny opportunities." path="/jobs" />
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
          </div>
          <div className="flex items-center gap-3">
            {isFamily && <CreateJobForm onCreated={fetchJobs} />}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-primary" />
            Job Marketplace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isGuest
              ? "Sign up to see full job details and apply"
              : isFamily ? "Manage your job postings and review applications" : "Browse and apply to childcare opportunities"}
          </p>
        </div>

        {/* Search — hidden for guests */}
        {!isGuest && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, location, or type..."
              className="pl-10 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={100}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No jobs match your search" : "No jobs posted yet"}
            </p>
            {isFamily && <CreateJobForm onCreated={fetchJobs} />}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`View details for ${job.title}`}
                onClick={() => isGuest ? navigate("/signup") : navigate(`/jobs/${job.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    isGuest ? navigate("/signup") : navigate(`/jobs/${job.id}`);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display font-semibold text-foreground">{job.title}</h3>
                      <Badge className={cn("text-xs", SERVICE_COLORS[job.service_type] || "bg-muted text-muted-foreground")}>
                        {SERVICE_LABELS[job.service_type] || job.service_type}
                      </Badge>
                      {/* Job activity indicators */}
                      {(() => {
                        const daysSincePosted = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSincePosted <= 3) {
                          return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">New</Badge>;
                        } else if (daysSincePosted <= 14) {
                          return <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Recently active</Badge>;
                        }
                        return null;
                      })()}
                    </div>

                    {!isGuest && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                        {job.job_source === "platform" || job.job_source === "partner" ? (
                          <>
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Verified by NannyElite
                            </Badge>
                            <span>· {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                          </>
                        ) : (
                          <span>Posted by {job.family_name} · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                        )}
                      </p>
                    )}

                    {isGuest && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                    )}

                    {job.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {isGuest ? truncate(job.description) : job.description}
                      </p>
                    )}

                    {/* Show basic metadata for guests, full for authenticated */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      )}
                      {!isGuest && job.hourly_rate && (
                        <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />CHF {Number(job.hourly_rate).toFixed(0)}/hr</span>
                      )}
                      {!isGuest && job.schedule && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.schedule}</span>
                      )}
                      {job.number_of_children && (
                        <span className="flex items-center gap-1"><Baby className="h-3 w-3" />{job.number_of_children} child{job.number_of_children > 1 ? "ren" : ""}</span>
                      )}
                      {!isGuest && job.start_date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(job.start_date), "MMM d")}
                          {job.end_date && ` – ${format(new Date(job.end_date), "MMM d")}`}
                        </span>
                      )}
                    </div>

                    {!isGuest && job.requirements && (
                      <p className="text-xs text-muted-foreground mt-2 italic">Requirements: {job.requirements}</p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2">
                    {isGuest ? (
                      <Button
                        size="sm"
                        className="rounded-full gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate("/signup"); }}
                      >
                        Sign up to apply
                      </Button>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {job.application_count || 0} applicant{(job.application_count || 0) !== 1 ? "s" : ""}
                        </span>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jobs/${job.id}`);
                          }}
                        >
                          View Details
                        </Button>

                        {!isFamily && (
                          !nannyApproved ? (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              ⏳ Approval required
                            </Badge>
                          ) : job.has_applied ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Applied
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-full gap-1"
                              onClick={(e) => { e.stopPropagation(); setApplyJobId(job.id); setApplyMessage(""); }}
                            >
                              <Send className="h-3 w-3" /> Apply
                            </Button>
                          )
                        )}

                        {isFamily && job.family_user_id === user?.id && (
                          <Link to={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="rounded-full text-xs">
                              View Applications
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Guest CTA banner */}
            {isGuest && filteredJobs.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                <p className="font-display font-semibold text-foreground mb-1">
                  Want to see full details and apply?
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a free account to view complete job postings, rates, and contact families directly.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate("/signup")} className="rounded-full">
                    Sign Up Free
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/login")} className="rounded-full">
                    Log In
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Apply Dialog */}
      <Dialog open={!!applyJobId} onOpenChange={(o) => { if (!o) setApplyJobId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Apply to Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Add a message to introduce yourself (optional)
              </p>
              <Textarea
                placeholder="Tell the family why you'd be a great fit..."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>
            <Button onClick={handleApply} disabled={applying} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {applying ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobMarketplace;
