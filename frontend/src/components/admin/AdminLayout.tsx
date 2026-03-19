import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Briefcase,
  CalendarCheck,
  UserCheck,
  Star,
  Award,
  Menu,
  X,
  LogOut,
  FileText,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin/dashboard" },
  { icon: UserCheck, label: "Profiles", to: "/admin/profiles" },
  { icon: Award, label: "Certificates", to: "/admin/certificates" },
  { icon: FileCheck, label: "Documents", to: "/admin/documents" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: Briefcase, label: "Jobs", to: "/admin/jobs" },
  { icon: FileText, label: "Applications", to: "/admin/applications" },
  { icon: CalendarCheck, label: "Bookings", to: "/admin/bookings" },
  { icon: Star, label: "Reviews", to: "/admin/reviews" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { role } = useAdminRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const Sidebar = (
    <aside
      className={`flex flex-col justify-between bg-card shadow-lg border-r border-border transition-all duration-300 z-40 ${
        collapsed ? "w-20" : "w-64"
      } h-screen fixed md:relative`}
    >
      {/* Header */}
      <div className={`flex items-center p-4 border-b border-border ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Settings className="text-primary-foreground h-4 w-4" />
            </div>
            <span className="text-lg font-semibold text-card-foreground truncate">
              Admin Panel
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent/20 hidden md:flex shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Mobile Close */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-border">
          <Badge variant="outline" className="text-xs capitalize w-full justify-center">
            {role}
          </Badge>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(({ icon: Icon, label, to }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              } ${collapsed ? "justify-center" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className={`w-full flex items-center gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-accent/20 ${
                collapsed ? "px-2 justify-center" : "px-3 justify-start"
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to log out from the admin panel?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-card z-40 w-64 shadow-xl border-r border-border transform transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {Sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden px-6 py-4 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Settings className="text-primary-foreground h-4 w-4" />
              </div>
              <span className="text-lg font-semibold text-foreground">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent/20"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
