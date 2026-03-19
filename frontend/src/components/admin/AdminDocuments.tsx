import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";

const getSignedDocumentUrl = async (documentUrl: string): Promise<string> => {
  try {
    const path = documentUrl.split("nanny-documents/")[1];
    if (!path) return documentUrl;
    const { data, error } = await supabase.storage
      .from("nanny-documents")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return documentUrl;
    return data.signedUrl;
  } catch {
    return documentUrl;
  }
};

const AdminDocuments = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: d } = await supabase.from("nanny_documents").select("*").order("created_at", { ascending: false });
    const sorted = (d || []).sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setDocs(sorted);

    // Resolve signed URLs for all documents
    const urlMap: Record<string, string> = {};
    await Promise.all(
      sorted.map(async (doc: any) => {
        if (doc.document_url) {
          urlMap[doc.id] = await getSignedDocumentUrl(doc.document_url);
        }
      })
    );
    setSignedUrls(urlMap);

    const userIds = [...new Set((d || []).map((doc: any) => doc.user_id))];
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (p || []).forEach((pr: any) => { map[pr.user_id] = pr.full_name || "Unknown"; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("nanny_documents").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Document ${status}` });
      fetchData();
    }
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "default" as const;
    if (s === "rejected") return "destructive" as const;
    return "secondary" as const;
  };

  if (loading) return <p className="text-muted-foreground">Loading documents...</p>;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nanny</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No documents submitted yet</TableCell></TableRow>
          )}
          {docs.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{profiles[d.user_id] || d.user_id.slice(0, 8)}</TableCell>
              <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
              <TableCell className="text-sm">{d.document_name || "—"}</TableCell>
              <TableCell><Badge variant={statusColor(d.status)}>{d.status}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <a href={signedUrls[d.id] || "#"} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                  {d.status === "pending" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(d.id, "approved")} className="text-emerald-600 hover:text-emerald-700">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(d.id, "rejected")} className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" />
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
  );
};

export default AdminDocuments;
