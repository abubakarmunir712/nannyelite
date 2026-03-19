import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Trash2, LogOut, ExternalLink, Plus, X, EyeOff, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
import Footer from "@/components/Footer";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [courseLinks, setCourseLinks] = useState<{ title: string; url: string }[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseUrl, setNewCourseUrl] = useState("");
  const [isNanny, setIsNanny] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const loadProfile = async () => {
      const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
      if (profile?.role === "nanny") {
        setIsNanny(true);
        const { data: np } = await supabase.from("nanny_profiles").select("course_links, profile_visible").eq("user_id", user.id).single();
        if (np?.course_links) setCourseLinks(np.course_links as any[]);
        setProfileVisible(np?.profile_visible !== false);
      }
    };
    loadProfile();
  }, [user, navigate]);

  if (!user) return null;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const userId = user.id;

    try {
      // Get conversation IDs to delete messages first
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`);
      const convoIds = convos?.map(c => c.id) || [];

      if (convoIds.length > 0) {
        await supabase.from("messages").delete().in("conversation_id", convoIds);
      }

      // Delete all related data in parallel
      await Promise.all([
        supabase.from("conversations").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
        supabase.from("bookings").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
        supabase.from("payments").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
        supabase.from("favorite_nannies").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
        supabase.from("nanny_references").delete().or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
        supabase.from("nanny_self_references").delete().eq("user_id", userId),
        supabase.from("nanny_photos").delete().eq("user_id", userId),
        supabase.from("nanny_documents").delete().eq("user_id", userId),
        supabase.from("user_certificates").delete().eq("user_id", userId),
        supabase.from("job_applications").delete().eq("nanny_user_id", userId),
        supabase.from("notifications").delete().eq("user_id", userId),
        supabase.from("activity_log").delete().eq("user_id", userId),
        supabase.from("availability_slots").delete().eq("user_id", userId),
        supabase.from("children").delete().eq("family_user_id", userId),
        supabase.from("jobs").delete().eq("family_user_id", userId),
      ]);

      // Delete profile-level records
      await Promise.all([
        supabase.from("nanny_profiles").delete().eq("user_id", userId),
        supabase.from("family_profiles").delete().eq("user_id", userId),
      ]);

      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);
    } catch (err) {
      console.error("Error deleting account data:", err);
    }

    await signOut();
    toast({ title: "Account data deleted", description: "Your data has been removed. Contact info@nannyelite.ch for full account deletion." });
    navigate("/");
    setDeleting(false);
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
          <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-6 py-12 space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>

        {/* Profile Visibility - Nanny only */}
        {isNanny && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-primary" /> Profile Visibility
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Hide your profile from search results and other members. Your profile will not be visible to families while hidden.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                {profileVisible ? "Your profile is visible to families" : "Your profile is hidden from everyone"}
              </span>
              <Switch
                checked={profileVisible}
                disabled={visibilityLoading}
                onCheckedChange={async (checked) => {
                  setVisibilityLoading(true);
                  setProfileVisible(checked);
                  const { error } = await supabase
                    .from("nanny_profiles")
                    .update({ profile_visible: checked })
                    .eq("user_id", user.id);
                  if (error) {
                    setProfileVisible(!checked);
                    toast({ title: "Error", description: "Could not update visibility.", variant: "destructive" });
                  } else {
                    toast({ title: checked ? "Profile visible" : "Profile hidden", description: checked ? "Families can now find your profile." : "Your profile is hidden from search results." });
                  }
                  setVisibilityLoading(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Course Links - Nanny only */}
        {isNanny && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" /> My Course Links
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Add links to your completed training courses to display on your profile.
            </p>
            <div className="space-y-2 mb-4">
              {courseLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <ExternalLink className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground hover:underline flex-1 truncate">
                    {link.title || link.url}
                  </a>
                  <button onClick={async () => {
                    const updated = courseLinks.filter((_, j) => j !== i);
                    setCourseLinks(updated);
                    await supabase.from("nanny_profiles").update({ course_links: updated }).eq("user_id", user.id);
                  }} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Course title" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} className="flex-1" />
              <Input placeholder="URL" value={newCourseUrl} onChange={e => setNewCourseUrl(e.target.value)} className="flex-1" />
              <Button variant="outline" size="icon" className="flex-shrink-0" onClick={async () => {
                if (!newCourseUrl.trim()) return;
                const updated = [...courseLinks, { title: newCourseTitle.trim() || newCourseUrl.trim(), url: newCourseUrl.trim() }];
                setCourseLinks(updated);
                setNewCourseTitle("");
                setNewCourseUrl("");
                await supabase.from("nanny_profiles").update({ course_links: updated }).eq("user_id", user.id);
                toast({ title: "Course link added" });
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-2 text-sm text-muted-foreground border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">Recommended Swiss Training:</p>
              <a href="https://www.redcross.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Swiss Red Cross — First Aid
              </a>
              <a href="https://www.kibesuisse.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> kibesuisse — Childcare Training
              </a>
              <a href="https://www.samariter.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Samariter — Emergency Training
              </a>
            </div>
          </div>
        )}

        {/* Static course links for families */}
        {!isNanny && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" /> Training & Courses
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Recommended childcare training resources.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="https://www.redcross.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Swiss Red Cross — First Aid Courses
              </a>
              <a href="https://www.kibesuisse.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> kibesuisse — Childcare Training
              </a>
              <a href="https://www.samariter.ch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Samariter — Emergency Training
              </a>
            </div>
          </div>
        )}

        {/* Privacy & Data Export */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Download Your Data
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Download a copy of all your personal data stored on NannyElite. This includes your profile, messages, bookings, and activity history.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const { data, error } = await supabase.functions.invoke("export-user-data");
                if (error) throw error;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `nannyelite-data-export-${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast({ title: "Export complete", description: "Your personal data has been downloaded." });
              } catch (err: any) {
                console.error("Export error:", err);
                toast({ title: "Export failed", description: err.message || "Could not export your data. Please try again.", variant: "destructive" });
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing export...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Download My Data</>
            )}
          </Button>
        </div>


        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </h3>
          <p className="text-sm text-muted-foreground mb-3">Sign out of your NannyElite account.</p>
          <Button variant="outline" className="rounded-full" onClick={async () => { await signOut(); navigate("/"); }}>
            Sign Out
          </Button>
        </div>

        {/* Delete Account */}
        <div className="bg-card rounded-xl border border-destructive/30 p-6">
          <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Delete Account
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            This will permanently delete your account data. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-full" disabled={deleting}>
                {deleting ? "Deleting..." : "Delete My Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account data including your profile, bookings, messages, and favorites. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
