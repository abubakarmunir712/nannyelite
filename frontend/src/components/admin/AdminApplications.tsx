import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ArrowRightLeft, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Application {
  id: string;
  job_id: string;
  nanny_user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_source: string;
  } | null;
  nanny_profile: {
    display_name: string | null;
    user_id: string;
  } | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "Pending Review", variant: "secondary" },
  sent_to_family: { label: "Sent to Family", variant: "default" },
  sent_to_external_family: { label: "Sent External", variant: "default" },
  redirected: { label: "Redirected", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
  pending: { label: "Pending (Legacy)", variant: "secondary" },
};

const SOURCE_BADGES: Record<string, { label: string; className: string }> = {
  family: { label: "REAL", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  platform: { label: "SEEDED", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  partner: { label: "PARTNER", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
};

const REDIRECT_MESSAGE = `Thank you for your application.

This position is currently under review. However we may have another family that matches your experience. We will contact you shortly if a suitable opportunity becomes available.`;

export default function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    application: Application | null;
    action: "approve" | "redirect" | "reject" | null;
  }>({ open: false, application: null, action: null });
  const [redirectMessage, setRedirectMessage] = useState(REDIRECT_MESSAGE);
  const [processing, setProcessing] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("job_applications")
        .select(`
          id,
          job_id,
          nanny_user_id,
          message,
          status,
          created_at,
          job:jobs!job_applications_job_id_fkey (
            id,
            title,
            location,
            job_source
          ),
          nanny_profile:nanny_profiles!job_applications_nanny_user_id_fkey (
            display_name,
            user_id
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications((data as any) || []);
    } catch (err: any) {
      toast({
        title: "Error loading applications",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleAction = async () => {
    if (!actionDialog.application || !actionDialog.action) return;

    setProcessing(true);
    const app = actionDialog.application;
    const action = actionDialog.action;

    try {
      let newStatus = "";
      let successMessage = "";

      if (action === "approve") {
        const jobSource = app.job?.job_source || "family";
        
        if (jobSource === "family") {
          // Send to registered family
          newStatus = "sent_to_family";
          successMessage = "Application sent to family.";
          // TODO: Implement notification to family user
        } else {
          // Platform or Partner - send to info@nannyelite.ch
          newStatus = "sent_to_external_family";
          successMessage = "Application forwarded to info@nannyelite.ch for manual processing.";
          // TODO: Implement email notification
        }
      } else if (action === "redirect") {
        newStatus = "redirected";
        successMessage = "Application redirected. Nanny has been notified.";
        // TODO: Send redirect message to nanny
      } else if (action === "reject") {
        newStatus = "rejected";
        successMessage = "Application rejected.";
      }

      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", app.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: successMessage,
      });

      setActionDialog({ open: false, application: null, action: null });
      fetchApplications();
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (application: Application, action: "approve" | "redirect" | "reject") => {
    setRedirectMessage(REDIRECT_MESSAGE);
    setActionDialog({ open: true, application, action });
  };

  const getActionDialogContent = () => {
    const { application, action } = actionDialog;
    if (!application || !action) return null;

    const jobSource = application.job?.job_source || "family";

    if (action === "approve") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              {jobSource === "family" ? (
                <>This application will be sent to the registered family user.</>  
              ) : (
                <>This application will be forwarded to <strong>info@nannyelite.ch</strong> for manual introduction to the external family.</>  
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Nanny:</strong> {application.nanny_profile?.display_name || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Job:</strong> {application.job?.title || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Job Source:</strong> {jobSource}
            </p>
          </div>
        </>
      );
    }

    if (action === "redirect") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Redirect Application</DialogTitle>
            <DialogDescription>
              The nanny will receive a message suggesting alternative opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Message to Nanny:</p>
              <Textarea
                value={redirectMessage}
                onChange={(e) => setRedirectMessage(e.target.value)}
                rows={6}
                className="text-sm"
              />
            </div>
          </div>
        </>
      );
    }

    if (action === "reject") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Nanny:</strong> {application.nanny_profile?.display_name || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Job:</strong> {application.job?.title || "Unknown"}
            </p>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
          <p className="text-muted-foreground">Manage nanny applications to jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="sent_to_family">Sent to Family</SelectItem>
              <SelectItem value="sent_to_external_family">Sent External</SelectItem>
              <SelectItem value="redirected">Redirected</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchApplications}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No applications found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nanny</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Job Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  const statusConfig = STATUS_BADGES[app.status] || STATUS_BADGES.pending_review;
                  const sourceConfig = SOURCE_BADGES[app.job?.job_source || "family"] || SOURCE_BADGES.family;
                  const isPending = app.status === "pending_review" || app.status === "pending";

                  return (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.nanny_profile?.display_name || "Unknown"}
                      </TableCell>
                      <TableCell>{app.job?.title || "Unknown Job"}</TableCell>
                      <TableCell>
                        <Badge className={sourceConfig.className}>
                          {sourceConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.job?.location || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(app.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openActionDialog(app, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => openActionDialog(app, "redirect")}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-1" />
                              Redirect
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openActionDialog(app, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/nanny/${app.nanny_user_id}`, "_blank")}
                          >
                            <User className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, application: null, action: null })}>
        <DialogContent>
          {getActionDialogContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, application: null, action: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog.action === "reject" ? "destructive" : "default"}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                actionDialog.action === "approve" ? "Approve & Send" :
                actionDialog.action === "redirect" ? "Redirect" : "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
