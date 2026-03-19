import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { validatePassword } from "@/utils/passwordValidation";
import logoImg from "@/assets/logo-option-5.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    const checkRecoveryState = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!mounted) return;

        if (!error) {
          setReady(true);
        }
        setChecking(false);
        return;
      }

      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        if (!mounted) return;
        setReady(true);
        setChecking(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        setReady(true);
      }

      setChecking(false);
    };

    checkRecoveryState();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const passwordCheck = useMemo(() => validatePassword(password), [password]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordCheck.valid) {
      toast({ title: "Weak password", description: passwordCheck.errors.join(". ") + ".", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Sign out so they use the new password, then redirect after a brief pause
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Invalid or expired reset link.</p>
          <Link to="/forgot-password" className="text-primary hover:underline text-sm">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src={logoImg} alt="NannyElite butterfly logo" className="h-14 w-14 object-contain" />
            <span className="font-display text-3xl font-bold text-primary">NannyElite</span>
          </Link>
        </div>
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">Password updated!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been changed successfully. Redirecting you to the login page…
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Go to login now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">Set new password</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter your new password below.</p>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {["At least 8 characters", "At least one uppercase letter", "At least one lowercase letter", "At least one number"].map((rule) => {
                        const passed = !passwordCheck.errors.includes(rule);
                        return (
                          <p key={rule} className={`text-xs flex items-center gap-1.5 ${passed ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {passed ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {rule}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
