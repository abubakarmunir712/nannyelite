import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Mail, Award, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiditVerificationPopup from "@/components/DiditVerificationPopup";

interface Step {
  key: string;
  label: string;
  icon: typeof Shield;
  done: boolean;
  description: string;
}

const VerificationProgress = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDidit, setShowDidit] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: nannyProfile }, { data: certs }] = await Promise.all([
        supabase.from("profiles").select("email_verified, phone_verified").eq("user_id", user.id).single(),
        supabase.from("nanny_profiles").select("profile_status, identity_verified, manual_identity_verified, bio").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_certificates" as any).select("id, status").eq("user_id", user.id),
      ]);

      const emailDone = !!(profile as any)?.email_verified || !!user.email_confirmed_at;
      const profileDone = nannyProfile?.profile_status === "approved";
      const identityDone = !!(nannyProfile as any)?.identity_verified || !!(nannyProfile as any)?.manual_identity_verified;
      const hasCerts = ((certs as any[]) || []).some((c: any) => c.status === "approved");
      const certsPending = ((certs as any[]) || []).some((c: any) => c.status === "pending");

      setSteps([
        {
          key: "email",
          label: "Email Verified",
          icon: Mail,
          done: emailDone,
          description: emailDone ? "Your email is verified" : "Verify your email address",
        },
        {
          key: "profile",
          label: "Profile Approved",
          icon: CheckCircle,
          done: profileDone,
          description: profileDone
            ? "Your profile is approved and visible"
            : nannyProfile?.profile_status === "pending"
            ? "Your profile is under review"
            : "Complete your profile to get approved",
        },
        {
          key: "identity",
          label: "Identity Verified",
          icon: Shield,
          done: identityDone,
          description: identityDone
            ? "Your identity is verified"
            : "Verify your identity to build trust with families",
        },
        {
          key: "certificates",
          label: "Certificates",
          icon: Award,
          done: hasCerts,
          description: hasCerts
            ? "You have approved certificates"
            : certsPending
            ? "Your certificates are under review"
            : "Upload certificates to earn more badges",
        },
      ]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.done).length;
  const percent = Math.round((completedCount / steps.length) * 100);

  return (
    <>
      <div
        className="bg-card rounded-xl border border-border p-4 space-y-3"
        data-testid="verification-progress"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Verification Progress
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{steps.length} ({percent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  step.done ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-muted/30"
                }`}
                data-testid={`progress-step-${step.key}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${step.done ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{step.description}</p>
                </div>
                {!step.done && step.key === "identity" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-primary hover:text-primary/80"
                    onClick={() => setShowDidit(true)}
                    data-testid="verify-identity-cta"
                  >
                    Verify <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
                {!step.done && step.key === "certificates" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-primary hover:text-primary/80"
                    onClick={() => window.location.href = "/settings"}
                    data-testid="upload-cert-cta"
                  >
                    Upload <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
                {!step.done && step.key === "profile" && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DiditVerificationPopup
        open={showDidit}
        onOpenChange={setShowDidit}
        onVerifyLater={() => setShowDidit(false)}
      />
    </>
  );
};

export default VerificationProgress;
