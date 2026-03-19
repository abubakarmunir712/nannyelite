import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Clock, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DiditVerificationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerifyLater: () => void;
}

const DiditVerificationPopup = ({ open, onOpenChange, onVerifyLater }: DiditVerificationPopupProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const callbackUrl = `${window.location.origin}/dashboard?didit=callback`;

      const { data, error } = await supabase.functions.invoke("didit-verification", {
        body: { callback_url: callbackUrl },
      });

      if (error) throw new Error(error.message || "Failed to create verification session");

      if (data.verification_url && !data.verification_url.includes("mock")) {
        window.location.href = data.verification_url;
      } else {
        toast({
          title: "DIDIT Verification (Demo Mode)",
          description: "Identity verification is not yet connected. Configure DIDIT credentials to enable real verification.",
        });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({
        title: "Verification unavailable",
        description: err.message || "Could not start verification. Try again later from your dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="didit-verification-popup">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verify your identity
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Identity verification is free for the first 500 users and helps families trust your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
            <p className="text-xs text-foreground font-medium">What happens during verification:</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <li>1. Present your ID document</li>
              <li>2. Take a selfie for biometric matching</li>
              <li>3. Liveness detection confirms you are real</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Your identity documents are never stored on NannyElite. Only the verification result is saved.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { onVerifyLater(); onOpenChange(false); }}
              className="flex-1 rounded-full gap-1.5"
              data-testid="didit-verify-later-btn"
            >
              <Clock className="h-4 w-4" />
              Verify Later
            </Button>
            <Button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 rounded-full gap-1.5"
              data-testid="didit-verify-now-btn"
            >
              {loading ? (
                <><Shield className="h-4 w-4 animate-pulse" /> Starting...</>
              ) : (
                <><ExternalLink className="h-4 w-4" /> Verify Identity</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiditVerificationPopup;
