import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Mail, Phone, Globe2, Package, Loader2, Users } from "lucide-react";

const empty = { buyer_name: "", company: "", country: "", product_interest: "", contact_number: "", email: "", notes: "" };

export default function PotentialBuyersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/potential_buyers");
      setList(data);
    } catch { toast.error("Could not load potential buyers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (b) => {
    setForm({
      buyer_name: b.buyer_name || "", company: b.company || "", country: b.country || "",
      product_interest: b.product_interest || "", contact_number: b.contact_number || "",
      email: b.email || "", notes: b.notes || "",
    });
    setEditingId(b.id);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/potential_buyers/${editingId}`, form);
        toast.success("Updated");
      } else {
        await api.post("/potential_buyers", form);
        toast.success("Added");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Delete ${name || "this lead"}?`)) return;
    await api.delete(`/potential_buyers/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1300px] page-fade-in" data-testid="potential-buyers-page">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="label-tracked mb-3">SALES PIPELINE</div>
          <h1 className="heading-display text-4xl">Potential Buyers</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-lg">
            Leads you're actively chasing. Kept separate from confirmed shipment records.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A] hover-lift transition" data-testid="add-lead-button">
              <Plus className="h-4 w-4 mr-2" /> Add lead
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-w-xl">
            <DialogHeader>
              <DialogTitle className="heading-display text-2xl">{editingId ? "Edit lead" : "New potential buyer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Buyer Name" value={form.buyer_name} onChange={(v) => setForm({ ...form, buyer_name: v })} testid="lead-name" required />
                <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} testid="lead-company" />
                <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} testid="lead-country" />
                <Field label="Product Interest" value={form.product_interest} onChange={(v) => setForm({ ...form, product_interest: v })} testid="lead-product" />
                <Field label="Contact Number" value={form.contact_number} onChange={(v) => setForm({ ...form, contact_number: v })} testid="lead-phone" />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="lead-email" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="rounded-sm mt-1.5" data-testid="lead-notes" placeholder="Met at trade fair · follow up next week · prefers EUR pricing..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-sm" data-testid="lead-cancel">Cancel</Button>
                <Button type="submit" disabled={saving} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="lead-save">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? "Save changes" : "Add lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading leads...
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-sm p-12 text-center bg-slate-50">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="label-tracked mb-2">NO LEADS YET</div>
          <p className="text-sm text-slate-500 mb-4">Start tracking prospective buyers separately from shipment records.</p>
          <Button onClick={openNew} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="empty-add-lead">
            <Plus className="h-4 w-4 mr-2" /> Add your first lead
          </Button>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((b) => (
            <div key={b.id} className="border border-slate-200 rounded-sm p-5 bg-white hover-lift transition group" data-testid={`lead-card-${b.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="heading-display text-lg leading-tight truncate">{b.company || b.buyer_name || "Unnamed lead"}</div>
                  {b.company && b.buyer_name && (
                    <div className="text-xs text-slate-500 mt-0.5">{b.buyer_name}</div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(b)} className="text-slate-400 hover:text-[#002FA7]" data-testid={`lead-edit-${b.id}`}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => del(b.id, b.company || b.buyer_name)} className="text-slate-400 hover:text-[#E53935]" data-testid={`lead-del-${b.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {b.country && (
                <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                  <Globe2 className="h-3 w-3" /> {b.country}
                </div>
              )}

              {b.product_interest && (
                <div className="flex items-start gap-2 mb-2 pb-3 border-b border-slate-100">
                  <Package className="h-3.5 w-3.5 text-[#002FA7] mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold text-slate-900">{b.product_interest}</span>
                </div>
              )}

              <div className="space-y-1.5 text-sm">
                {b.email && (
                  <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-slate-700 hover:text-[#002FA7] mono text-xs truncate" data-testid={`lead-email-link-${b.id}`}>
                    <Mail className="h-3 w-3 shrink-0" /> {b.email}
                  </a>
                )}
                {b.contact_number && (
                  <a href={`tel:${b.contact_number}`} className="flex items-center gap-2 text-slate-700 hover:text-[#002FA7] mono text-xs" data-testid={`lead-phone-link-${b.id}`}>
                    <Phone className="h-3 w-3 shrink-0" /> {b.contact_number}
                  </a>
                )}
              </div>

              {b.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 line-clamp-3 whitespace-pre-line">
                  {b.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid, required }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-[#E53935]">*</span>}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="rounded-sm mt-1.5 h-10" data-testid={testid} />
    </div>
  );
}
