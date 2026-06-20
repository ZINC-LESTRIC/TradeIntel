import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Logo, { LiveDot } from "@/components/Logo";
import { fmtMoney, fmtNum, currencySymbol } from "@/lib/format";
import {
  Database, Globe, Users, Package, TrendingUp, ArrowRight, Sparkles,
  Activity, Factory, Building2, Coins, ArrowUpRight, ArrowDownRight, Calendar, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#D4AF37", "#3B82F6", "#10B981", "#F59E0B", "#60A5FA", "#FBBF24", "#22C55E", "#A78BFA"];

const fmtCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [now, setNow] = useState(new Date());
  const { isAdmin, user } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([api.get("/stats"), api.get("/analytics")]);
      setStats(s.data);
      setAnalytics(a.data);
    } catch (e) {
      toast.error("Could not load terminal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post("/seed");
      if (data.seeded) toast.success(`Seeded ${data.count} records`);
      else toast.info(`Already have ${data.existing} records`);
      load();
    } catch { toast.error("Seed failed"); }
    finally { setSeeding(false); }
  };

  const empty = !loading && stats && stats.total_records === 0;

  // Ticker items from top countries + currencies
  const tickerItems = useMemo(() => {
    if (!stats) return [];
    const items = [];
    (stats.top_countries || []).forEach((c) => {
      items.push({ symbol: c.country.toUpperCase().slice(0, 3) + "·EXP", value: fmtCompact(c.value), trend: "+", count: c.count });
    });
    (analytics?.currency_breakdown || []).forEach((c) => {
      items.push({ symbol: `PKR/${c.currency}`, value: `${currencySymbol(c.currency)}${fmtCompact(c.value)}`, trend: "+", count: c.count });
    });
    return items;
  }, [stats, analytics]);

  return (
    <div className="page-fade-in" data-testid="dashboard-page">
      {/* TERMINAL HEADER BAR */}
      <div className="border-b sticky top-0 z-30 backdrop-blur" style={{ background: "rgba(11, 20, 38, 0.92)", borderColor: "var(--ti-border)" }}>
        <div className="flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-6">
            <Logo variant="icon" live height={36} />
            <div>
              <div className="heading-display text-xl tracking-tight leading-none text-white">
                TRADE<span className="text-[#60A5FA]">INTEL</span>
                <span className="text-[10px] mono ml-2 tracking-[0.2em]" style={{ color: "var(--ti-gold)" }}>TERMINAL</span>
              </div>
              <div className="text-[10px] mono mt-1 tracking-wider" style={{ color: "var(--ti-text-dim)" }}>
                PAKISTAN EXPORT INTELLIGENCE · {user?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <LiveDot label="LIVE" />
            <div className="text-right mono">
              <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--ti-text-dim)" }}>{now.toUTCString().split(" ").slice(0, 4).join(" ")}</div>
              <div className="text-lg font-bold" style={{ color: "var(--ti-gold)" }}>{now.toUTCString().split(" ")[4]} <span className="text-xs ml-1" style={{ color: "var(--ti-text-dim)" }}>UTC</span></div>
            </div>
          </div>
        </div>

        {/* TICKER */}
        {tickerItems.length > 0 && (
          <div className="border-t overflow-hidden" style={{ borderColor: "var(--ti-border)", background: "var(--ti-bg)" }}>
            <div className="ticker-track py-1.5">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-5 text-[11px] mono">
                  <span className="font-bold" style={{ color: "var(--ti-gold)" }}>{t.symbol}</span>
                  <span style={{ color: "var(--ti-text)" }}>{t.value}</span>
                  <span className="font-bold" style={{ color: "var(--ti-green)" }}>{t.trend}{t.count}</span>
                  <span style={{ color: "var(--ti-border-strong)" }}>·</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-8 max-w-[1600px]">
        {/* Hero / Headline */}
        <div className="flex items-end justify-between mb-6 animate-in">
          <div>
            <div className="label-tracked mb-3 flex items-center gap-2">
              <Activity className="h-3 w-3" /> TERMINAL OVERVIEW
            </div>
            <h1 className="heading-display text-5xl text-white leading-none">
              Live <span className="text-gold-gradient">Trade</span> Intelligence
            </h1>
            <p className="text-sm mt-3 max-w-2xl" style={{ color: "var(--ti-text-muted)" }}>
              Every Pakistani export shipment indexed in one place. Search by product or country and instantly see who's buying, at what price, in which city, and from which Pakistani exporter.
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && empty && (
              <Button onClick={handleSeed} disabled={seeding} variant="outline" className="rounded-sm hover-lift" data-testid="seed-button">
                <Sparkles className="h-4 w-4 mr-2" />
                {seeding ? "Seeding..." : "Seed sample data"}
              </Button>
            )}
            <Link to="/search">
              <Button className="rounded-sm bg-[#002FA7] hover-lift" data-testid="cta-search">
                Run Search <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-6">
          <Kpi label="SHIPMENTS" value={fmtNum(stats?.total_records)} icon={Database} sub="indexed" trend="+" testid="stat-records" />
          <Kpi label="PRODUCTS" value={fmtNum(stats?.unique_products)} icon={Package} sub="unique" testid="stat-products" />
          <Kpi label="BUYERS" value={fmtNum(stats?.unique_buyers)} icon={Users} sub="companies" testid="stat-buyers" />
          <Kpi label="EXPORTERS" value={fmtNum(stats?.unique_exporters)} icon={Factory} sub="PK based" testid="stat-exporters" />
          <Kpi label="COUNTRIES" value={fmtNum(stats?.unique_countries)} icon={Globe} sub="destinations" testid="stat-countries" />
          <Kpi label="GROSS VALUE" value={fmtCompact(stats?.total_value)} icon={Coins} sub="USD equiv." highlight testid="stat-value" />
        </div>

        {empty && (
          <div className="border border-dashed rounded-sm p-12 text-center" style={{ borderColor: "var(--ti-border-strong)", background: "var(--ti-surface)" }}>
            <div className="label-tracked mb-3">NO DATA STREAM</div>
            <h3 className="heading-display text-2xl mb-2">Workspace is empty</h3>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--ti-text-muted)" }}>
              {isAdmin ? "Drop a shipping invoice / packing list / GD — Gemini Vision will parse it." : "Ask the admin to populate the terminal."}
            </p>
            {isAdmin && (
              <Button onClick={handleSeed} disabled={seeding} className="rounded-sm bg-[#002FA7]" data-testid="empty-seed-button">
                <Sparkles className="h-4 w-4 mr-2" />Seed sample data
              </Button>
            )}
          </div>
        )}

        {!empty && stats && analytics && (
          <>
            {/* CHARTS ROW */}
            <div className="grid grid-cols-12 gap-2 mb-6">
              {/* Monthly volume area */}
              <div className="col-span-12 lg:col-span-8 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: "var(--ti-gold)" }} />
                    <h3 className="heading-display text-lg text-white">Monthly Export Volume</h3>
                  </div>
                  <span className="label-tracked">12-MONTH FLOW</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={analytics.monthly_series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(212,175,55,0.06)" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
                      <Tooltip
                        contentStyle={{ background: "#0F1F35", border: "1px solid #2A4163", borderRadius: 2, fontSize: 11 }}
                        labelStyle={{ color: "#D4AF37" }}
                        itemStyle={{ color: "#E8EEF7" }}
                        formatter={(v) => fmtCompact(v)}
                      />
                      <Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#goldFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category donut */}
              <div className="col-span-12 lg:col-span-4 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" style={{ color: "var(--ti-blue-bright)" }} />
                    <h3 className="heading-display text-lg text-white">Categories</h3>
                  </div>
                  <span className="label-tracked">MIX</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={analytics.category_breakdown} dataKey="value" nameKey="category" innerRadius={50} outerRadius={88} paddingAngle={2} stroke="#0F1F35" strokeWidth={2}>
                        {analytics.category_breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0F1F35", border: "1px solid #2A4163", borderRadius: 2, fontSize: 11 }}
                        formatter={(v) => fmtCompact(v)}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="square"
                        wrapperStyle={{ fontSize: 10, color: "#94A3B8" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* BAR CHART + TOP BUYERS */}
            <div className="grid grid-cols-12 gap-2 mb-6">
              <div className="col-span-12 lg:col-span-7 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" style={{ color: "var(--ti-green)" }} />
                    <h3 className="heading-display text-lg text-white">Top Destination Markets</h3>
                  </div>
                  <span className="label-tracked">BY GROSS VALUE</span>
                </div>
                <div className="h-60">
                  <ResponsiveContainer>
                    <BarChart data={stats.top_countries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(212,175,55,0.06)" vertical={false} />
                      <XAxis dataKey="country" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                      <Tooltip
                        contentStyle={{ background: "#0F1F35", border: "1px solid #2A4163", borderRadius: 2, fontSize: 11 }}
                        labelStyle={{ color: "#D4AF37" }}
                        formatter={(v) => fmtCompact(v)}
                      />
                      <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Buyers list */}
              <div className="col-span-12 lg:col-span-5 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" style={{ color: "var(--ti-gold)" }} />
                    <h3 className="heading-display text-lg text-white">Top Buyers</h3>
                  </div>
                  <span className="label-tracked">LEADERBOARD</span>
                </div>
                <div className="space-y-0">
                  {analytics.top_buyers.slice(0, 7).map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm border-b" style={{ borderColor: "var(--ti-border)" }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="mono text-[10px] w-5 text-right" style={{ color: "var(--ti-text-dim)" }}>#{i + 1}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{b.buyer}</div>
                          <div className="text-[10px] mono uppercase tracking-wider" style={{ color: "var(--ti-text-dim)" }}>{b.country} · {b.shipments} ship</div>
                        </div>
                      </div>
                      <div className="mono font-bold text-sm" style={{ color: "var(--ti-gold)" }}>{fmtCompact(b.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CURRENCY BREAKDOWN + RECENT FEED */}
            <div className="grid grid-cols-12 gap-2 mb-6">
              <div className="col-span-12 lg:col-span-5 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4" style={{ color: "var(--ti-gold)" }} />
                    <h3 className="heading-display text-lg text-white">Currency Exposure</h3>
                  </div>
                  <span className="label-tracked">FX MIX</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--ti-border)" }}>
                      <th className="text-left py-2 label-tracked">CCY</th>
                      <th className="text-right py-2 label-tracked">Value</th>
                      <th className="text-right py-2 label-tracked">Lots</th>
                      <th className="text-right py-2 label-tracked">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = analytics.currency_breakdown.reduce((a, b) => a + b.value, 0) || 1;
                      return analytics.currency_breakdown.map((c) => (
                        <tr key={c.currency} className="border-b" style={{ borderColor: "var(--ti-border)" }}>
                          <td className="py-2 mono font-bold" style={{ color: "var(--ti-gold)" }}>{c.currency}</td>
                          <td className="py-2 text-right mono text-white">{currencySymbol(c.currency)}{fmtCompact(c.value)}</td>
                          <td className="py-2 text-right mono" style={{ color: "var(--ti-text-muted)" }}>{c.count}</td>
                          <td className="py-2 text-right mono" style={{ color: "var(--ti-blue-bright)" }}>{((c.value / total) * 100).toFixed(1)}%</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="col-span-12 lg:col-span-7 stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: "var(--ti-gold-glow)" }} />
                    <h3 className="heading-display text-lg text-white">Recent Shipments Feed</h3>
                    <LiveDot label="LIVE" />
                  </div>
                  <Link to="/records" className="label-tracked hover:text-[var(--ti-gold)] transition" style={{ color: "var(--ti-blue-bright)" }}>VIEW ALL →</Link>
                </div>
                <div className="space-y-0 mono">
                  {stats.recent?.map((r) => (
                    <Link key={r.id} to={`/records/${r.id}`} className="grid grid-cols-12 gap-2 items-center py-2 text-xs border-b hover:bg-[var(--ti-surface-2)] transition px-1 -mx-1" style={{ borderColor: "var(--ti-border)" }}>
                      <div className="col-span-1" style={{ color: "var(--ti-gold)" }}>{r.shipment_date?.slice(5, 10) || "—"}</div>
                      <div className="col-span-4 font-bold text-white truncate">{r.product_name}</div>
                      <div className="col-span-3 truncate" style={{ color: "var(--ti-text-muted)" }}>{r.buyer_company}</div>
                      <div className="col-span-2" style={{ color: "var(--ti-blue-bright)" }}>{r.buyer_country}</div>
                      <div className="col-span-2 text-right font-bold" style={{ color: "var(--ti-gold)" }}>{currencySymbol(r.currency)}{fmtCompact(r.total_value)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* What you can do here */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FeatureCard icon={Sparkles} title="AI Document Reader" desc="Drop a GD, invoice or packing list. Gemini Vision extracts every buyer detail in under 20s." to={isAdmin ? "/upload" : "/search"} cta={isAdmin ? "Open Upload" : "Try search"} />
              <FeatureCard icon={Activity} title="Per-Segment Analytics" desc="Search 'shirts' and see who buys at €5 vs €13 — broken down by country, buyer and exporter." to="/search" cta="Run a query" />
              <FeatureCard icon={Users} title="Sales Pipeline" desc={isAdmin ? "Track potential buyers separately from confirmed shipments. Convert leads to revenue." : "Admins manage a parallel pipeline of prospective buyers."} to={isAdmin ? "/potential-buyers" : "/records"} cta={isAdmin ? "Open pipeline" : "Browse records"} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, highlight, testid, trend }) {
  return (
    <div className={`stat-card relative ${highlight ? "" : ""}`} data-testid={testid} style={highlight ? { background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(11,20,38,0) 100%)", borderColor: "rgba(212,175,55,0.4)" } : {}}>
      <div className="flex items-start justify-between mb-2">
        <span className="label-tracked">{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color: highlight ? "var(--ti-gold)" : "var(--ti-text-dim)" }} />
      </div>
      <div className="heading-display text-2xl" style={{ color: highlight ? "var(--ti-gold)" : "var(--ti-text)" }}>{value}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {trend && <ArrowUpRight className="h-3 w-3" style={{ color: "var(--ti-green)" }} />}
        <span className="text-[10px] mono uppercase tracking-wider" style={{ color: "var(--ti-text-dim)" }}>{sub}</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, to, cta }) {
  return (
    <Link to={to} className="stat-card group block hover-lift">
      <Icon className="h-5 w-5 mb-3" style={{ color: "var(--ti-gold)" }} />
      <div className="heading-display text-lg text-white mb-1">{title}</div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--ti-text-muted)" }}>{desc}</p>
      <span className="text-[10px] mono uppercase tracking-[0.2em] font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: "var(--ti-gold)" }}>
        {cta} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
