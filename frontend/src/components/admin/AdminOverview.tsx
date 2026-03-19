import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, CalendarCheck, FileCheck, FileText, Home } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface Stats {
  totalUsers: number;
  totalNannies: number;
  totalFamilies: number;
  activeJobs: number;
  pendingApplications: number;
  pendingDocuments: number;
}

interface GrowthData {
  name: string;
  value: number;
}

interface DistributionData {
  name: string;
  value: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalNannies: 0,
    totalFamilies: 0,
    activeJobs: 0,
    pendingApplications: 0,
    pendingDocuments: 0,
  });
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch stats
        const [users, nannies, families, jobs, applications, docs] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("nanny_profiles").select("id", { count: "exact", head: true }),
          // Count families from profiles table where role = 'family' (more reliable than family_profiles due to RLS)
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "family"),
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("job_applications").select("id", { count: "exact", head: true }).in("status", ["pending_review", "pending"]),
          supabase.from("nanny_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        setStats({
          totalUsers: users.count ?? 0,
          totalNannies: nannies.count ?? 0,
          totalFamilies: families.count ?? 0,
          activeJobs: jobs.count ?? 0,
          pendingApplications: applications.count ?? 0,
          pendingDocuments: docs.count ?? 0,
        });

        // Fetch user growth data (last 6 months)
        const monthsData: GrowthData[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));
          
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString());
          
          monthsData.push({
            name: format(monthStart, "MMM"),
            value: count ?? 0,
          });
        }
        setGrowthData(monthsData);

        // Fetch admin count for distribution (try admin_roles, fallback to 0)
        let adminCount = 0;
        try {
          const { count } = await supabase
            .from("admin_roles")
            .select("id", { count: "exact", head: true });
          adminCount = count ?? 0;
        } catch {
          // RLS might block this
        }

        setDistributionData([
          { name: "Nannies", value: nannies.count ?? 0 },
          { name: "Families", value: families.count ?? 0 },
          { name: "Admins", value: adminCount },
        ]);

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Families", value: stats.totalFamilies, icon: Home, color: "text-blue-500" },
    { label: "Nannies", value: stats.totalNannies, icon: Users, color: "text-emerald-500" },
    { label: "Active Jobs", value: stats.activeJobs, icon: Briefcase, color: "text-amber-500" },
    { label: "Pending Applications", value: stats.pendingApplications, icon: FileText, color: "text-purple-500" },
    { label: "Pending Documents", value: stats.pendingDocuments, icon: FileCheck, color: "text-red-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* User Growth Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
            <p className="text-sm text-muted-foreground">New signups over the last 6 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Distribution Pie Chart */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">User Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Breakdown by user type</p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {distributionData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
