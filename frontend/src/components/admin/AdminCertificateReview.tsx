import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, ExternalLink, Award, Clock, User } from "lucide-react";

const CERT_LABELS: Record<string, string> = {
  first_aid: "First Aid Certificate",
  childcare_diploma: "Childcare Diploma",
  early_childhood: "Early Childhood Education",
  driving_license: "Driving License",
  other: "Other Certificate",
};

const AdminCertificateReview = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: certs } = await supabase
      .from("user_certificates" as any)
      .select("*")
      .order("created_at", { ascending: false });

    const userIds = [...new Set((certs || []).map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const nameMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      nameMap[p.user_id] = p.full_name || p.email || p.user_id.slice(0, 8);
    });

    setCertificates(certs || []);
    setProfileNames(nameMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (certId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("user_certificates" as any)
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", certId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Certificate ${status}` });
      fetchData();
    }
  };

  const pendingCount = certificates.filter(c => c.status === "pending").length;

  if (loading) return <p className="text-muted-foreground">Loading certificates...</p>;

  return (
    <div className="space-y-4" data-testid="admin-certificate-review">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Certificate Review</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Review uploaded professional certificates independently from profile approval. 
        Approving a certificate does not approve the profile, and vice versa.
      </p>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Certificate Type</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No certificates uploaded yet
                </TableCell>
              </TableRow>
            )}
            {certificates.map((cert) => (
              <TableRow
                key={cert.id}
                className={cert.status === "pending" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{profileNames[cert.user_id] || cert.user_id.slice(0, 8)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {CERT_LABELS[cert.certificate_type] || cert.certificate_type}
                </TableCell>
                <TableCell>
                  <a
                    href={cert.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                </TableCell>
                <TableCell>
                  {cert.status === "approved" && <Badge className="bg-emerald-600 text-xs">Approved</Badge>}
                  {cert.status === "rejected" && <Badge variant="destructive" className="text-xs">Rejected</Badge>}
                  {cert.status === "pending" && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(cert.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {cert.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-emerald-600 hover:text-emerald-700"
                        onClick={() => handleAction(cert.id, "approved")}
                        data-testid={`approve-cert-${cert.id}`}
                      >
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive/80"
                        onClick={() => handleAction(cert.id, "rejected")}
                        data-testid={`reject-cert-${cert.id}`}
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                  {cert.status !== "pending" && (
                    <span className="text-xs text-muted-foreground">
                      {cert.reviewed_at ? `Reviewed ${new Date(cert.reviewed_at).toLocaleDateString()}` : "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCertificateReview;
