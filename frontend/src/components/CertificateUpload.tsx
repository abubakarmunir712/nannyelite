import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Award, CheckCircle, Clock, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CERTIFICATE_TYPES = [
  { value: "first_aid", label: "First Aid Certificate" },
  { value: "childcare_diploma", label: "Childcare Diploma" },
  { value: "early_childhood", label: "Early Childhood Education Diploma" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other Childcare Certificate" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pending: { label: "Under Review", className: "bg-amber-100 text-amber-800", icon: Clock },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", icon: X },
};

export interface Certificate {
  id: string;
  certificate_type: string;
  file_url: string;
  status: string;
  created_at: string;
}

interface CertificateUploadProps {
  existingCertificates: Certificate[];
  onUploaded?: () => void;
}

const CertificateUpload = ({ existingCertificates, onUploaded }: CertificateUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("first_aid");

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/cert_${selectedType}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("nanny-documents").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("nanny-documents").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("user_certificates" as any).insert({
      user_id: user.id,
      certificate_type: selectedType,
      file_url: urlData.publicUrl,
      status: "pending",
    });

    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Certificate uploaded", description: "Your certificate is pending admin review." });
      onUploaded?.();
    }
    setUploading(false);
  };

  const typeLabel = (type: string) => CERTIFICATE_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-4" data-testid="certificate-upload">
      <div className="flex items-center gap-2 mb-2">
        <Award className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-foreground">Professional Certificates</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload your professional certificates. These will be reviewed by an admin and generate trust badges on your profile.
        No identity documents — only professional certificates.
      </p>

      {/* Existing certificates */}
      {existingCertificates.length > 0 && (
        <div className="space-y-2">
          {existingCertificates.map((cert) => {
            const statusConfig = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            return (
              <div key={cert.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{typeLabel(cert.certificate_type)}</span>
                </div>
                <Badge className={`text-xs ${statusConfig.className}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload new certificate */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Certificate Type</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger data-testid="certificate-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CERTIFICATE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            data-testid="certificate-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 pointer-events-none w-full"
            disabled={uploading}
            data-testid="certificate-upload-btn"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload Certificate"}
          </Button>
        </Label>
      </div>
    </div>
  );
};

export default CertificateUpload;
