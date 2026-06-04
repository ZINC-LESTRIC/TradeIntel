import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

const empty = {
  exporter_name: "", exporter_company: "", exporter_address: "", exporter_country: "Pakistan",
  buyer_name: "", buyer_company: "", buyer_address: "", buyer_city: "", buyer_country: "", buyer_email: "",
  product_name: "", product_category: "",
  unit_price: 0, currency: "USD", quantity: 0, unit: "pcs", total_value: 0,
  gross_weight_kg: 0, cartons: 0,
  shipment_date: "", gd_number: "", invoice_number: "", notes: "",
};

const SECTIONS = [
  {
    title: "PRODUCT",
    fields: [
      ["product_name", "Product Name", "text"],
      ["product_category", "Category", "text"],
      ["unit_price", "Unit Price", "number"],
      ["currency", "Currency (USD/EUR/GBP/PKR)", "text"],
      ["quantity", "Quantity", "number"],
      ["unit", "Unit (pcs/kg/sets/...)", "text"],
      ["total_value", "Total Value", "number"],
      ["gross_weight_kg", "Gross Weight (kg)", "number"],
      ["cartons", "Cartons", "number"],
    ],
  },
  {
    title: "EXPORTER (PAKISTAN)",
    fields: [
      ["exporter_company", "Company", "text"],
      ["exporter_name", "Contact Name", "text"],
      ["exporter_country", "Country", "text"],
      ["exporter_address", "Address", "textarea"],
    ],
  },
  {
    title: "BUYER",
    fields: [
      ["buyer_company", "Company", "text"],
      ["buyer_name", "Contact Name", "text"],
      ["buyer_city", "City", "text"],
      ["buyer_country", "Country", "text"],
      ["buyer_email", "Email", "text"],
      ["buyer_address", "Address", "textarea"],
    ],
  },
  {
    title: "SHIPMENT",
    fields: [
      ["gd_number", "GD #", "text"],
      ["invoice_number", "Invoice #", "text"],
      ["shipment_date", "Date (YYYY-MM-DD)", "text"],
      ["notes", "Notes", "textarea"],
    ],
  },
];

export default function AddRecordPage() {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/records", form);
      toast.success("Record saved");
      navigate(`/records/${data.id}`);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl" data-testid="add-record-page">
      <div className="mb-8">
        <div className="label-tracked mb-3">MANUAL ENTRY</div>
        <h1 className="heading-display text-4xl">Add trade record</h1>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="border border-slate-200 rounded-sm p-6">
            <div className="label-tracked mb-5">{sec.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sec.fields.map(([k, label, type]) => (
                <div key={k} className={type === "textarea" ? "md:col-span-2" : ""}>
                  <Label className="text-xs font-semibold text-slate-600">{label}</Label>
                  {type === "textarea" ? (
                    <Textarea
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      rows={2}
                      className="rounded-sm mt-1.5"
                      data-testid={`add-field-${k}`}
                    />
                  ) : (
                    <Input
                      type={type}
                      step="0.01"
                      value={form[k]}
                      onChange={(e) => set(k, type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
                      className="rounded-sm mt-1.5 h-10"
                      data-testid={`add-field-${k}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="add-save-button">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save record"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/records")} className="rounded-sm" data-testid="add-cancel-button">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
