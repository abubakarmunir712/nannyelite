import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Shield, Camera, FileText, CheckCircle, Clock, RotateCcw, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Document {
  id: string;
  document_type: string;
  document_name: string | null;
  status: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { type: "government_id", label: "Government ID", icon: FileText, description: "Passport, ID card, or residence permit" },
  { type: "selfie", label: "Selfie Verification", icon: Camera, description: "Clear photo of your face for identity matching", allowCamera: true },
  { type: "police_certificate", label: "Police Certificate", icon: Shield, description: "Swiss Strafregisterauszug or equivalent" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pending: { label: "Under Review", className: "bg-amber-100 text-amber-800", icon: Clock },
  approved: { label: "Verified", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", icon: Clock },
};

const IdVerification = ({ existingDocs }: { existingDocs: Document[] }) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraDocType, setCameraDocType] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async (docType: string) => {
    setCameraDocType(docType);
    setCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access.", variant: "destructive" });
      setCameraOpen(false);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
    }
  }, []);

  const retakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  };

  const confirmCapture = async () => {
    if (!capturedImage || !user || !cameraDocType) return;
    stopCamera();
    setCameraOpen(false);

    const blob = await (await fetch(capturedImage)).blob();
    setUploading(cameraDocType);

    const filePath = `${user.id}/${cameraDocType}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("nanny-documents").upload(filePath, blob);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("nanny-documents").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("nanny_documents").insert({
      user_id: user.id,
      document_type: cameraDocType,
      document_name: `${cameraDocType}-capture.jpg`,
      document_url: urlData.publicUrl,
      status: "pending",
    });

    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Photo captured & uploaded", description: "Your document is being reviewed." });
      window.location.reload();
    }
    setUploading(null);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploading(docType);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${docType}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("nanny-documents").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("nanny-documents").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("nanny_documents").insert({
      user_id: user.id,
      document_type: docType,
      document_name: file.name,
      document_url: urlData.publicUrl,
      status: "pending",
    });

    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded", description: "Your document is being reviewed." });
      window.location.reload();
    }
    setUploading(null);
  };

  return (
    <>
      <div className="space-y-4">
        {DOC_TYPES.map((doc) => {
          const existing = existingDocs.find((d) => d.document_type === doc.type);
          const statusConfig = existing ? STATUS_CONFIG[existing.status || "pending"] : null;

          return (
            <div key={doc.type} className="bg-card rounded-xl border border-border p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <doc.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {existing && statusConfig ? (
                  <Badge className={`text-xs ${statusConfig.className}`}>
                    <statusConfig.icon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {doc.allowCamera && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-1.5"
                        disabled={uploading === doc.type}
                        onClick={() => startCamera(doc.type)}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Take Photo
                      </Button>
                    )}
                    <Label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(doc.type, file);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-1.5 pointer-events-none"
                        disabled={uploading === doc.type}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading === doc.type ? "Uploading..." : "Upload"}
                      </Button>
                    </Label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera capture dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => { if (!open) { stopCamera(); setCameraOpen(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take a Selfie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {capturedImage ? (
              <div className="relative">
                <img src={capturedImage} alt="Captured selfie" className="w-full rounded-lg" />
              </div>
            ) : (
              <video ref={videoRef} className="w-full rounded-lg bg-muted" style={{ transform: "scaleX(-1)" }} autoPlay muted playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              {capturedImage ? (
                <>
                  <Button variant="outline" onClick={retakePhoto} className="flex-1 gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                  <Button onClick={confirmCapture} className="flex-1 gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Confirm & Upload
                  </Button>
                </>
              ) : (
                <Button onClick={capturePhoto} className="w-full gap-1.5">
                  <Camera className="h-4 w-4" /> Capture
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IdVerification;
