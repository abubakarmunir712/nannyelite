import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, DollarSign, Clock, CheckCircle, TrendingUp,
  Calendar, Download,
} from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";
import RateSuggestion from "@/components/RateSuggestion";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  description: string | null;
  paid_at: string | null;
  created_at: string;
  booking_id: string | null;
  family_name?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  released: "bg-emerald-100 text-emerald-800",
  held: "bg-blue-100 text-blue-800",
  cancelled: "bg-destructive/10 text-destructive",
};

const Earnings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nannyProfile, setNannyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    const fetchPayments = async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("nanny_user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const familyIds = [...new Set(data.map((p: any) => p.family_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", familyIds);

        setPayments(data.map((p: any) => ({
          ...p,
          family_name: profiles?.find((pr) => pr.user_id === p.family_user_id)?.full_name || "Family",
        })));
      }

      // Fetch nanny profile for rate suggestion
      const { data: np } = await supabase
        .from("nanny_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (np) setNannyProfile(np);

      setLoading(false);
    };

    fetchPayments();
  }, [user, navigate]);

  const totalEarned = payments
    .filter((p) => p.status === "completed" || p.status === "released")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingAmount = payments
    .filter((p) => p.status === "pending" || p.status === "held")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const thisMonth = payments.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const thisMonthEarned = thisMonth
    .filter((p) => p.status === "completed" || p.status === "released")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const exportCSV = () => {
    const headers = "Date,Family,Amount,Currency,Status,Type,Description\n";
    const rows = payments.map((p) =>
      `${format(new Date(p.created_at), "yyyy-MM-dd")},${p.family_name || ""},${p.amount},${p.currency},${p.status},${p.payment_type},${p.description || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nannyelite-earnings-${format(new Date(), "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
          <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button></Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your income and payment history</p>
          </div>
          <Button variant="outline" className="rounded-full gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-foreground">CHF {totalEarned.toFixed(0)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-foreground">CHF {pendingAmount.toFixed(0)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">This Month</span>
            </div>
            <p className="text-2xl font-bold text-foreground">CHF {thisMonthEarned.toFixed(0)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {payments.filter((p) => p.status === "completed" || p.status === "released").length}
            </p>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Annual Tax Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Gross Income</span>
              <p className="font-semibold text-foreground">CHF {totalEarned.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">AHV/IV/EO (est. 5.3%)</span>
              <p className="font-semibold text-foreground">CHF {(totalEarned * 0.053).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Net (estimated)</span>
              <p className="font-semibold text-foreground">CHF {(totalEarned * 0.947).toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * These are estimates only. Consult a tax professional for accurate calculations.
          </p>
        </div>

        {/* AI Rate Suggestion */}
        {nannyProfile && (
          <div className="mb-6">
            <RateSuggestion nannyProfile={nannyProfile} />
          </div>
        )}

        {/* Payment History */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Payment History</h3>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-muted-foreground">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No payments yet. Complete bookings to start earning!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.family_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                      {p.description && ` • ${p.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${STATUS_STYLES[p.status] || ""}`}>
                      {p.status}
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">
                      {p.currency} {Number(p.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Earnings;
