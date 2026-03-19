import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requiredRole?: "admin" | "moderator" | "support";
}

const AdminGuard = ({ children, requiredRole }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasAdminAccess, isAdmin } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasAdminAccess) return <Navigate to="/dashboard" replace />;

  if (requiredRole === "admin" && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default AdminGuard;
