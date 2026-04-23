import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Globe, Users, Package, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

const formatNum = (n) => new Intl.NumberFormat("en-US").format(n || 0);
const formatMoney = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/stats");
      setStats(data);
    } catch (e) {
      toast.error("Could not load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post("/seed");
      if (data.seeded) toast.success(`Seeded ${data.count} sample records`);
      else toast.info(`Already have ${data.existing} records`);
      load();
    } catch {
      toast.error("Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const empty = !loading && stats && stats.total_records === 0;

  return (
    <div className="p-8 lg:p-12 max-w-[1400px]" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-10 animate-in">
        <div>
          <div className="label-tracked mb-3">OVERVIEW</div>
          <h1 className="heading-display text-4xl lg:text-5xl">Trade Intelligence</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-lg">
            Live snapshot of every shipment, buyer, exporter and price you have indexed.
          </p>
        </div>
        <div className="flex gap-2">
          {empty && (
            <Button
              onClick={handleSeed}
              disabled={seeding}
              variant="outline"
              className="rounded-sm border-slate-300"
              data-testid="seed-button"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {seeding ? "Seeding..." : "Seed sample data"}
            </Button>
          )}
          <Link to="/upload">
            <Button className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="cta-upload-doc">
              Upload document <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
        <StatCard label="RECORDS" value={formatNum(stats?.total_records)} icon={Database} testid="stat-records" />
        <StatCard label="PRODUCTS" value={formatNum(stats?.unique_products)} icon={Package} testid="stat-products" />
        <StatCard label="BUYERS" value={formatNum(stats?.unique_buyers)} icon={Users} testid="stat-buyers" />
        <StatCard label="COUNTRIES" value={formatNum(stats?.unique_countries)} icon={Globe} testid="stat-countries" />
        <StatCard label="TOTAL VALUE" value={formatMoney(stats?.total_value)} icon={TrendingUp} testid="stat-value" highlight />
      </div>

      {empty && (
        <div className="border border-dashed border-slate-300 rounded-sm p-12 text-center bg-slate-50">
          <div className="label-tracked mb-3">NO DATA YET</div>
          <h3 className="heading-display text-2xl mb-2">Start by uploading or seeding</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Drag in a shipping invoice, packing list or BL — Gemini Vision will read it.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleSeed} disabled={seeding} className="rounded-sm bg-[#002FA7] hover:bg-[#00227A]" data-testid="empty-seed-button">
              <Sparkles className="h-4 w-4 mr-2" />Seed 30 sample records
            </Button>
            <Link to="/upload">
              <Button variant="outline" className="rounded-sm" data-testid="empty-upload-button">Upload a document</Button>
            </Link>
          </div>
        </div>
      )}

      {!empty && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Top countries */}
          <div className="lg:col-span-1 stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-display text-lg">Top destinations</h3>
              <span className="label-tracked">BY VALUE</span>
            </div>
            <div className="space-y-2.5">
              {stats.top_countries?.map((c) => (
                <CountryBar key={c.country} item={c} max={stats.top_countries[0].value} />
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="lg:col-span-1 stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-display text-lg">Top products</h3>
              <span className="label-tracked">BY VALUE</span>
            </div>
            <div className="space-y-2.5">
              {stats.top_products?.map((p) => (
                <div key={p.product} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{p.product}</div>
                    <div className="text-xs text-slate-400">{p.count} shipment{p.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="mono text-xs font-bold text-[#002FA7]">{formatMoney(p.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div className="lg:col-span-1 stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-display text-lg">Recent imports</h3>
              <Link to="/records" className="label-tracked text-[#002FA7]">VIEW ALL</Link>
            </div>
            <div className="space-y-3">
              {stats.recent?.map((r) => (
                <Link key={r.id} to={`/records/${r.id}`} className="block border-b border-slate-100 pb-2 hover:bg-slate-50 -mx-2 px-2 transition">
                  <div className="font-semibold text-sm text-slate-900 truncate">{r.product_name}</div>
                  <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                    <span className="truncate mr-2">{r.buyer_company} · {r.buyer_country}</span>
                    <span className="mono text-[#002FA7] whitespace-nowrap">{formatMoney(r.total_value)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, testid, highlight }) {
  return (
    <div className={`stat-card relative overflow-hidden ${highlight ? "bg-[#002FA7] text-white border-[#002FA7]" : ""}`} data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`label-tracked ${highlight ? "text-white/70" : ""}`}>{label}</div>
          <div className={`heading-display text-3xl mt-2 ${highlight ? "text-white" : "text-slate-900"}`}>{value}</div>
        </div>
        <Icon className={`h-5 w-5 ${highlight ? "text-white/60" : "text-slate-300"}`} />
      </div>
    </div>
  );
}

function CountryBar({ item, max }) {
  const pct = max ? (item.value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-slate-900">{item.country}</span>
        <span className="mono text-xs text-slate-500">{formatMoney(item.value)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 relative">
        <div className="absolute inset-y-0 left-0 bg-[#002FA7]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
