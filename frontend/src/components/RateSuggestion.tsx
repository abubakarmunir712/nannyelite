import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface RateResult {
  suggested_spot_rate: number;
  suggested_recurring_rate: number;
  rate_range: { low: number; high: number };
  factors_increasing: string[];
  factors_decreasing: string[];
  market_position: string;
  explanation: string;
}

const POSITION_LABELS: Record<string, { label: string; className: string }> = {
  below_average: { label: "Below Average", className: "bg-amber-100 text-amber-800" },
  average: { label: "Average", className: "bg-blue-100 text-blue-800" },
  above_average: { label: "Above Average", className: "bg-emerald-100 text-emerald-800" },
  premium: { label: "Premium", className: "bg-purple-100 text-purple-800" },
};

const RateSuggestion = ({ nannyProfile }: { nannyProfile: any }) => {
  const [result, setResult] = useState<RateResult | null>(null);
  const [loading, setLoading] = useState(false);

  const getSuggestion = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.functions.invoke("ai-rate-suggestion", {
      body: { nanny_profile: nannyProfile },
      headers: {
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
    });
    if (data && !data.error) setResult(data);
    setLoading(false);
  };

  if (!result) {
    return (
      <Button onClick={getSuggestion} disabled={loading} variant="outline" size="sm" className="rounded-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing..." : "Get AI Rate Suggestion"}
      </Button>
    );
  }

  const pos = POSITION_LABELS[result.market_position] || POSITION_LABELS.average;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Rate Suggestion
        </h3>
        <Badge className={pos.className}>{pos.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Spot Rate</p>
          <p className="text-xl font-bold text-foreground">CHF {result.suggested_spot_rate}</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Recurring</p>
          <p className="text-xl font-bold text-foreground">CHF {result.suggested_recurring_rate}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Market range: CHF {result.rate_range.low} – {result.rate_range.high}/hr
      </p>

      {result.factors_increasing.length > 0 && (
        <div className="space-y-1">
          {result.factors_increasing.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> {f}
            </div>
          ))}
        </div>
      )}

      {result.factors_decreasing.length > 0 && (
        <div className="space-y-1">
          {result.factors_decreasing.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-amber-500" /> {f}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">{result.explanation}</p>
    </div>
  );
};

export default RateSuggestion;
