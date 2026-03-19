import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Flag, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReviewRow {
  id: string;
  nanny_user_id: string;
  family_user_id: string;
  rating: number;
  title: string;
  content: string;
  relationship: string | null;
  service_period: string | null;
  is_flagged: boolean;
  is_verified_interaction: boolean;
  created_at: string;
  nanny_name?: string;
  family_name?: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "flagged">("all");

  const loadReviews = async () => {
    setLoading(true);
    let query = supabase.from("nanny_references").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "flagged") query = query.eq("is_flagged", true);

    const { data: refs } = await query;
    if (!refs) { setLoading(false); return; }

    const userIds = [...new Set(refs.flatMap((r: any) => [r.nanny_user_id, r.family_user_id]))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

    const enriched = refs.map((r: any) => ({
      ...r,
      nanny_name: profiles?.find((p) => p.user_id === r.nanny_user_id)?.full_name || "Nanny",
      family_name: profiles?.find((p) => p.user_id === r.family_user_id)?.full_name || "Family",
    }));
    setReviews(enriched);
    setLoading(false);
  };

  useEffect(() => { loadReviews(); }, [filter]);

  const toggleFlag = async (id: string, currentFlag: boolean) => {
    const { error } = await supabase.from("nanny_references").update({ is_flagged: !currentFlag } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: currentFlag ? "Review unhidden" : "Review hidden", description: currentFlag ? "Review is now visible." : "Review has been hidden from public view." });
    loadReviews();
  };

  const toggleVerified = async (id: string, current: boolean) => {
    const { error } = await supabase.from("nanny_references").update({ is_verified_interaction: !current } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: !current ? "Marked verified" : "Verification removed" });
    loadReviews();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Review Moderation</h2>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "flagged" ? "default" : "outline"} size="sm" onClick={() => setFilter("flagged")}>
            <Flag className="h-3.5 w-3.5 mr-1" /> Hidden
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews found.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className={`bg-card border border-border rounded-lg p-4 ${r.is_flagged ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">{r.family_name}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm font-medium text-foreground">{r.nanny_name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`h-3 w-3 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    {r.is_flagged && <Badge variant="destructive" className="text-[10px]">Hidden</Badge>}
                    {r.is_verified_interaction && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Verified</Badge>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {r.relationship && `${r.relationship} • `}{r.service_period && `${r.service_period} • `}{new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleVerified(r.id, r.is_verified_interaction)} title={r.is_verified_interaction ? "Remove verification" : "Mark as verified"}>
                    <ShieldCheck className={`h-4 w-4 ${r.is_verified_interaction ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleFlag(r.id, r.is_flagged)} title={r.is_flagged ? "Unhide" : "Hide"}>
                    {r.is_flagged ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
