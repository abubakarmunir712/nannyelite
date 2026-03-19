import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Quote, User, Plus, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Reference {
  id: string;
  family_user_id: string;
  rating: number;
  title: string;
  content: string;
  relationship: string | null;
  service_period: string | null;
  is_flagged: boolean;
  is_verified_interaction: boolean;
  created_at: string;
  family_name?: string;
}

const TITLE_MAX = 120;
const CONTENT_MAX = 800;

const StarRating = ({ rating, onChange, interactive = false }: { rating: number; onChange?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onClick={() => onChange?.(i)}
        className={interactive ? "cursor-pointer" : "cursor-default"}
      >
        <Star
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      </button>
    ))}
  </div>
);

const NannyReferences = ({ nannyUserId }: { nannyUserId: string }) => {
  const { user } = useAuth();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [existingRef, setExistingRef] = useState<Reference | null>(null);
  const [eligible, setEligible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relationship, setRelationship] = useState("");
  const [servicePeriod, setServicePeriod] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!existingRef;

  const loadReferences = async () => {
    const { data: refs } = await supabase
      .from("nanny_references")
      .select("*")
      .eq("nanny_user_id", nannyUserId)
      .eq("is_flagged", false)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      const familyIds = refs.map((r: any) => r.family_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", familyIds);

      const enriched = refs.map((r: any) => ({
        ...r,
        family_name: profiles?.find((p) => p.user_id === r.family_user_id)?.full_name || "Family",
      }));
      setReferences(enriched);

      if (user) {
        const myRef = enriched.find((r: any) => r.family_user_id === user.id);
        setExistingRef(myRef || null);
      }
    } else {
      setReferences([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadReferences();

      if (user) {
        // Check role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setUserRole(profile?.role || null);

        // Check eligibility via DB function
        if (profile?.role === "family" && user.id !== nannyUserId) {
          const { data: canReview } = await supabase.rpc("can_review_nanny", {
            _family_id: user.id,
            _nanny_id: nannyUserId,
          });
          setEligible(!!canReview);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [nannyUserId, user]);

  const populateFormForEdit = () => {
    if (existingRef) {
      setRating(existingRef.rating);
      setTitle(existingRef.title);
      setContent(existingRef.content);
      setRelationship(existingRef.relationship || "");
      setServicePeriod(existingRef.service_period || "");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setRelationship("");
    setServicePeriod("");
    setRating(5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (title.length > TITLE_MAX) {
      toast({ title: "Title too long", description: `Maximum ${TITLE_MAX} characters.`, variant: "destructive" });
      return;
    }
    if (content.length > CONTENT_MAX) {
      toast({ title: "Review too long", description: `Maximum ${CONTENT_MAX} characters.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);

    if (isEditing && existingRef) {
      // Update existing
      const { error } = await supabase.from("nanny_references").update({
        rating,
        title,
        content,
        relationship: relationship || null,
        service_period: servicePeriod || null,
      } as any).eq("id", existingRef.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Review updated", description: "Your review has been updated." });
        setDialogOpen(false);
        await loadReferences();
      }
    } else {
      // Insert new
      const { error } = await supabase.from("nanny_references").insert({
        nanny_user_id: nannyUserId,
        family_user_id: user.id,
        rating,
        title,
        content,
        relationship: relationship || null,
        service_period: servicePeriod || null,
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already reviewed", description: "You have already reviewed this nanny.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Review submitted", description: "Thank you for your feedback!" });
        setDialogOpen(false);
        resetForm();
        await loadReferences();
      }
    }
    setSubmitting(false);
  };

  const avgRating = references.length > 0
    ? (references.reduce((sum, r) => sum + r.rating, 0) / references.length).toFixed(1)
    : null;

  const canLeaveOrEdit = user && userRole === "family" && user.id !== nannyUserId && eligible;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Quote className="h-4 w-4 text-primary" /> Parent Reviews
          {references.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({references.length}) • {avgRating} <Star className="h-3 w-3 inline fill-amber-400 text-amber-400" />
            </span>
          )}
        </h3>
        {canLeaveOrEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (open && isEditing) populateFormForEdit();
            if (open && !isEditing) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                {isEditing ? <><Pencil className="h-3.5 w-3.5" /> Edit Review</> : <><Plus className="h-3.5 w-3.5" /> Write Review</>}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Your Review" : "Write a Review"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <StarRating rating={rating} onChange={setRating} interactive />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-title">Title <span className="text-xs text-muted-foreground">({title.length}/{TITLE_MAX})</span></Label>
                  <Input
                    id="ref-title"
                    placeholder="e.g. Wonderful with our kids"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                    maxLength={TITLE_MAX}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-content">Your Review <span className="text-xs text-muted-foreground">({content.length}/{CONTENT_MAX})</span></Label>
                  <Textarea
                    id="ref-content"
                    placeholder="Share your experience..."
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
                    maxLength={CONTENT_MAX}
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ref-relationship">Relationship</Label>
                    <Input
                      id="ref-relationship"
                      placeholder="e.g. Regular babysitter"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ref-period">Service Period</Label>
                    <Input
                      id="ref-period"
                      placeholder="e.g. Jan – Jun 2025"
                      value={servicePeriod}
                      onChange={(e) => setServicePeriod(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                  {submitting ? "Saving..." : isEditing ? "Update Review" : "Submit Review"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Eligibility message for families without enough interaction */}
      {user && userRole === "family" && user.id !== nannyUserId && !eligible && !existingRef && !loading && (
        <p className="text-xs text-muted-foreground mb-4 italic">
          Reviews are available after an interaction with the caregiver.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews...</p>
      ) : references.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {references.map((ref) => (
            <div key={ref.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{ref.family_name}</span>
                  {ref.relationship && (
                    <span className="text-xs text-muted-foreground">• {ref.relationship}</span>
                  )}
                  {ref.is_verified_interaction && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <StarRating rating={ref.rating} />
              </div>
              <h4 className="text-sm font-medium text-foreground">{ref.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ref.content}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {ref.service_period && <span>{ref.service_period}</span>}
                <span>{new Date(ref.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NannyReferences;
