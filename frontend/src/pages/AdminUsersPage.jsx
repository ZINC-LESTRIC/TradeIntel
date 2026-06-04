import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ban, ShieldCheck, Trash2, UserCheck } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch {
      toast.error("Could not load users");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const ban = async (id) => {
    if (!window.confirm("Ban this user? They will not be able to login.")) return;
    try {
      await api.post(`/admin/users/${id}/ban`);
      toast.success("User banned");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  const unban = async (id) => {
    await api.post(`/admin/users/${id}/unban`);
    toast.success("User reinstated");
    load();
  };
  const del = async (id, email) => {
    if (!window.confirm(`Permanently delete ${email}?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const admins = users.filter(u => u.role === "admin").length;
  const viewers = users.filter(u => u.role === "viewer").length;
  const banned = users.filter(u => u.banned).length;

  return (
    <div className="p-8 lg:p-12 max-w-[1200px]" data-testid="admin-users-page">
      <div className="mb-8">
        <div className="label-tracked mb-3">ADMINISTRATION</div>
        <h1 className="heading-display text-4xl">Users</h1>
        <p className="text-sm text-slate-500 mt-2">
          {users.length} total · {admins} admin · {viewers} viewer · {banned} banned
        </p>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 text-left label-tracked">Name</th>
              <th className="p-3 text-left label-tracked">Email</th>
              <th className="p-3 text-left label-tracked">Role</th>
              <th className="p-3 text-left label-tracked">Status</th>
              <th className="p-3 text-left label-tracked">Last login</th>
              <th className="p-3 text-left label-tracked">Joined</th>
              <th className="p-3 text-right label-tracked">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading...</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">No users yet</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                <td className="p-3 font-semibold">{u.name || "—"}</td>
                <td className="p-3 mono text-slate-700">{u.email}</td>
                <td className="p-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="rounded-sm text-[10px] uppercase tracking-wider">
                    {u.role}
                  </Badge>
                </td>
                <td className="p-3">
                  {u.banned ? (
                    <span className="text-[#E53935] text-xs font-bold uppercase tracking-wider">Banned</span>
                  ) : (
                    <span className="text-[#10B981] text-xs font-bold uppercase tracking-wider">Active</span>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-500">{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                <td className="p-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {u.role !== "admin" && (
                    <div className="flex gap-1 justify-end">
                      {u.banned ? (
                        <Button onClick={() => unban(u.id)} size="sm" variant="outline" className="rounded-sm h-8" data-testid={`unban-${u.id}`}>
                          <UserCheck className="h-3 w-3 mr-1" /> Unban
                        </Button>
                      ) : (
                        <Button onClick={() => ban(u.id)} size="sm" variant="outline" className="rounded-sm h-8 text-[#E53935] border-red-200 hover:bg-red-50" data-testid={`ban-${u.id}`}>
                          <Ban className="h-3 w-3 mr-1" /> Ban
                        </Button>
                      )}
                      <Button onClick={() => del(u.id, u.email)} size="sm" variant="ghost" className="rounded-sm h-8 text-slate-400 hover:text-[#E53935]" data-testid={`del-${u.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {u.role === "admin" && (
                    <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                      <ShieldCheck className="h-3 w-3" /> protected
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
