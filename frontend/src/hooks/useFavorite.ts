import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useFavorite = (nannyUserId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !nannyUserId) return;
    supabase
      .from("favorite_nannies")
      .select("id")
      .eq("family_user_id", user.id)
      .eq("nanny_user_id", nannyUserId)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, nannyUserId]);

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to save favorites.", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (isFavorite) {
      await supabase.from("favorite_nannies").delete().eq("family_user_id", user.id).eq("nanny_user_id", nannyUserId!);
      setIsFavorite(false);
      toast({ title: "Removed from favorites" });
    } else {
      await supabase.from("favorite_nannies").insert({ family_user_id: user.id, nanny_user_id: nannyUserId! });
      setIsFavorite(true);
      toast({ title: "Added to favorites" });
    }
    setLoading(false);
  };

  return { isFavorite, loading, toggle };
};
