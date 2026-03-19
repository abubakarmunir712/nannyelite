import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";

const AdminBookings = () => {
  const { isAdmin } = useAdminRole();
  const [bookings, setBookings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: b } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100);
    setBookings(b || []);
    const userIds = [...new Set((b || []).flatMap((bk: any) => [bk.family_user_id, bk.nanny_user_id]))];
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (p || []).forEach((pr: any) => { map[pr.user_id] = pr.full_name || "Unknown"; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Booking ${status}` });
      fetchData();
    }
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "default";
    if (s === "cancelled") return "destructive";
    if (s === "completed") return "secondary";
    return "outline";
  };

  if (loading) return <p className="text-muted-foreground">Loading bookings...</p>;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Family</TableHead>
            <TableHead>Nanny</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead>Change Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
          )}
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{profiles[b.family_user_id] || "—"}</TableCell>
              <TableCell>{profiles[b.nanny_user_id] || "—"}</TableCell>
              <TableCell className="text-sm">{b.booking_date}</TableCell>
              <TableCell className="text-sm">{b.start_time ? `${b.start_time}–${b.end_time}` : "—"}</TableCell>
              <TableCell><Badge variant={statusColor(b.status)}>{b.status}</Badge></TableCell>
              {isAdmin && (
                <TableCell>
                  <Select value={b.status} onValueChange={(val) => updateStatus(b.id, val)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["pending", "confirmed", "completed", "cancelled"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminBookings;
