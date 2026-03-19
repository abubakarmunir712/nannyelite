import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/signup");
      return;
    }

    const checkRoleAndRedirect = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role === "nanny") {
        navigate("/onboarding/nanny");
      } else if (profile?.role === "family") {
        navigate("/onboarding/family");
      } else {
        // If no role is found, redirect to dashboard or a role selection if we had one
        // For now, dashboard is a safe bet as it might handle role selection or profile completion
        navigate("/dashboard");
      }
    };

    checkRoleAndRedirect();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground text-sm">Loading onboarding...</div>
    </div>
  );
};

export default Onboarding;
