import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Trash2, MapPin, Mail, Building2, Factory, Package, Calendar, Hash } from "lucide-react";

const formatMoney = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(null);

  useEffect(() => {
    api.get(`/records/${id}`).then(({ data }) => setR(data)).catch(() => toast.error("Not found"));
  }, [id]);

  const del = async () => {
    if (!window.confirm("Delete this record?")) return;
    await api.delete(`/records/${id}`);
    toast.success("Deleted");
    navigate("/records");
  };

  if (!r) return <div className="p-12 text-slate-400">Loading...</div>;

  return (
    <div className="p-8 lg:p-12 max-w-5xl" data-testid="record-detail-page">
      <Link to="/records" className="text-xs uppercase tracking-wider text-slate-500 hover:text-[#002FA7] flex items-center gap-1 mb-6">
        <ArrowLeft className="h-3 w-3" /> All records
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="label-tracked mb-3">{r.product_category || "TRADE RECORD"}</div>
          <h1 className="heading-display text-4xl mb-2">{r.product_name}</h1>
          <p className="text-sm text-slate-500 mono">Invoice {r.invoice_number || "—"} · {r.shipment_date || "no date"}</p>
        </div>
        <Button onClick={del} variant="outline" className="rounded-sm border-red-200 text-[#E53935] hover:bg-red-50" data-testid="detail-delete-button">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </Button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Kpi label="UNIT PRICE" value={`$${r.unit_price?.toFixed(2)}`} sub={`per ${r.unit}`} />
        <Kpi label="QUANTITY" value={new Intl.NumberFormat().format(r.quantity)} sub={r.unit} />
        <Kpi label="TOTAL VALUE" value={formatMoney(r.total_value)} sub={r.currency} highlight />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Block title="Exporter" icon={Factory}>
          <Row label="Company" value={r.exporter_company} />
          <Row label="Contact" value={r.exporter_name} />
          <Row label="Country" value={r.exporter_country} icon={MapPin} />
          <Row label="Address" value={r.exporter_address} multiline />
        </Block>

        <Block title="Buyer / Consignee" icon={Building2}>
          <Row label="Company" value={r.buyer_company} />
          <Row label="Contact" value={r.buyer_name} />
          <Row label="Country" value={r.buyer_country} icon={MapPin} />
          <Row label="Email" value={r.buyer_email} icon={Mail} mono />
          <Row label="Address" value={r.buyer_address} multiline />
        </Block>

        <Block title="Product" icon={Package}>
          <Row label="Name" value={r.product_name} />
          <Row label="Category" value={r.product_category} />
        </Block>

        <Block title="Shipment" icon={Calendar}>
          <Row label="Invoice #" value={r.invoice_number} icon={Hash} mono />
          <Row label="Date" value={r.shipment_date} />
          <Row label="Notes" value={r.notes} multiline />
        </Block>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }) {
  return (
    <div className={`stat-card ${highlight ? "bg-[#002FA7] text-white border-[#002FA7]" : ""}`}>
      <div className={`label-tracked ${highlight ? "text-white/70" : ""}`}>{label}</div>
      <div className={`heading-display text-2xl mt-2 ${highlight ? "text-white" : ""}`}>{value}</div>
      <div className={`text-xs mt-1 ${highlight ? "text-white/60" : "text-slate-400"}`}>{sub}</div>
    </div>
  );
}

function Block({ title, icon: Icon, children }) {
  return (
    <div className="border border-slate-200 rounded-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-[#002FA7]" />
        <h3 className="heading-display text-lg">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, icon: Icon, mono, multiline }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="text-xs uppercase tracking-wider text-slate-400 font-bold pt-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={`col-span-2 ${mono ? "mono text-slate-700" : "text-slate-900"} ${multiline ? "whitespace-pre-line" : ""}`}>
        {value || <span className="text-slate-300">—</span>}
      </div>
    </div>
  );
}
