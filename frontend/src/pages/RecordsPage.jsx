import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { fmtMoney, fmtNum, currencySymbol } from "@/lib/format";

export default function RecordsPage() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ countries: [], buyers: [], exporters: [], products: [], categories: [] });
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("__all__");
  const [exporter, setExporter] = useState("__all__");
  const [buyer, setBuyer] = useState("__all__");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (country !== "__all__") params.country = country;
      if (exporter !== "__all__") params.exporter = exporter;
      if (buyer !== "__all__") params.buyer = buyer;
      const { data } = await api.get("/records", { params });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    const { data } = await api.get("/filters");
    setFilters(data);
  };

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [country, exporter, buyer]);

  const summary = useMemo(() => {
    const byCur = {};
    records.forEach(r => {
      const c = r.currency || "USD";
      byCur[c] = (byCur[c] || 0) + (r.total_value || 0);
    });
    return Object.entries(byCur).map(([cur, val]) => fmtMoney(val, cur)).join(" · ");
  }, [records]);

  const reset = () => { setQ(""); setCountry("__all__"); setExporter("__all__"); setBuyer("__all__"); };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await api.delete(`/records/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-8 lg:p-12" data-testid="records-page">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="label-tracked mb-3">DATABASE</div>
          <h1 className="heading-display text-4xl">All records</h1>
          <p className="text-sm text-slate-500 mt-2">{records.length} records {summary && `· ${summary}`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
        <div className="md:col-span-2 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Free text search..."
            className="pl-9 h-10 rounded-sm"
            data-testid="records-search-input"
          />
        </div>
        <FilterSelect value={country} onChange={setCountry} options={filters.countries} placeholder="All countries" testid="filter-country" />
        <FilterSelect value={exporter} onChange={setExporter} options={filters.exporters} placeholder="All exporters" testid="filter-exporter" />
        <FilterSelect value={buyer} onChange={setBuyer} options={filters.buyers} placeholder="All buyers" testid="filter-buyer" />
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={load} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="apply-filters-button">Apply</Button>
        <Button onClick={reset} variant="outline" className="rounded-sm" data-testid="reset-filters-button">
          <X className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      <div className="border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Product</Th>
              <Th>Buyer</Th>
              <Th>City / Country</Th>
              <Th>Exporter</Th>
              <Th align="right">Unit Price</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Total</Th>
              <Th>Date</Th>
              {isAdmin && <Th align="right"></Th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-slate-400">Loading...</td></tr>
            )}
            {!loading && records.length === 0 && (
              <tr><td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-slate-400">No records found</td></tr>
            )}
            {records.map((r) => {
              const sym = currencySymbol(r.currency || "USD");
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition" data-testid={`record-tr-${r.id}`}>
                  <td className="p-3">
                    <Link to={`/records/${r.id}`} className="font-bold text-slate-900 hover:text-[#002FA7]">{r.product_name}</Link>
                    <div className="text-xs text-slate-400">{r.product_category}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{r.buyer_company}</div>
                    <div className="text-xs text-slate-400">{r.buyer_name}</div>
                  </td>
                  <td className="p-3">
                    {r.buyer_city && <div className="font-semibold">{r.buyer_city}</div>}
                    <div className="text-xs text-slate-500">{r.buyer_country}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{r.exporter_company}</div>
                    <div className="text-xs text-slate-400">{r.exporter_name}</div>
                  </td>
                  <td className="p-3 text-right mono">{sym}{r.unit_price?.toFixed(2)}</td>
                  <td className="p-3 text-right mono text-slate-500">{fmtNum(r.quantity)} {r.unit}</td>
                  <td className="p-3 text-right mono font-bold text-[#002FA7]">{fmtMoney(r.total_value, r.currency)}</td>
                  <td className="p-3 text-xs text-slate-500">{r.shipment_date}</td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-[#E53935] transition" data-testid={`delete-${r.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return <th className={`p-3 label-tracked text-${align}`}>{children}</th>;
}

function FilterSelect({ value, onChange, options, placeholder, testid }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 rounded-sm" data-testid={testid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
