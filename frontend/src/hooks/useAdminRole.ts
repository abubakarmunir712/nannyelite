import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AdminRole = "admin" | "moderator" | "support" | null;

export const useAdminRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        const adminRole = data?.find(
          (r) => r.role === "admin" || r.role === "moderator" || r.role === "support"
        );
        setRole((adminRole?.role as AdminRole) ?? null);
      } catch (err) {
        console.error("Error checking admin role:", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isLoading: loading,
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isSupport: role === "support",
    hasAdminAccess: role === "admin" || role === "moderator" || role === "support",
  };
};
