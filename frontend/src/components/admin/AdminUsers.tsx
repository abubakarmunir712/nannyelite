import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, Shield, UserX } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";

// Data type badge based on is_seeded database field
const dataTypeBadge = (isSeeded: boolean | undefined | null) => {
  if (isSeeded === false) {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold">R</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold">S</Badge>;
};

const AdminUsers = () => {
  const { isAdmin } = useAdminRole();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles(p || []);
    const roleMap: Record<string, string[]> = {};
    (r || []).forEach((ur: any) => {
      if (!roleMap[ur.user_id]) roleMap[ur.user_id] = [];
      roleMap[ur.user_id].push(ur.role);
    });
    setRoles(roleMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role added" });
      fetchData();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removed" });
      fetchData();
    }
  };

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-muted-foreground">Loading users...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                <TableCell>{dataTypeBadge(p.is_seeded)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.email || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(roles[p.user_id] || []).map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                        {r}
                        {isAdmin && (
                          <button onClick={() => removeRole(p.user_id, r)} className="ml-1 hover:text-destructive">×</button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Select onValueChange={(val) => addRole(p.user_id, val)}>
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        {["admin", "moderator", "support", "nanny", "family"]
                          .filter((r) => !(roles[p.user_id] || []).includes(r))
                          .map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
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
    </div>
  );
};

export default AdminUsers;
