import { useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search as SearchIcon, MapPin, Building2, Factory, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMoney, fmtNum, currencySymbol } from "@/lib/format";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1400px]" data-testid="search-page">
      <div className="mb-8 animate-in">
        <div className="label-tracked mb-3">SEARCH</div>
        <h1 className="heading-display text-4xl lg:text-5xl mb-3">Find every shipment</h1>
        <p className="text-sm text-slate-500">
          Type a product (shirts, embroidery, sportswear, basmati rice...) and see who buys it, at what price, in which city, from which Pakistani exporter.
        </p>
      </div>

      <form onSubmit={runSearch} className="relative mb-8 animate-in">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: shirts, embroidery, sportswear, leather, basmati rice..."
          className="h-14 pl-12 pr-32 text-base rounded-sm border-slate-300 focus:border-[#002FA7] focus:ring-[#002FA7]"
          data-testid="search-input"
        />
        <Button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 rounded-sm bg-[#002FA7] hover:bg-[#00227A]"
          data-testid="search-submit-button"
        >
          {loading ? "Searching..." : "Search →"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 mb-10">
        {["shirts", "trousers", "embroidery", "sportswear", "bedlinen", "leather", "rice"].map((c) => (
          <button
            key={c}
            onClick={() => { setQ(c); setTimeout(() => document.querySelector('[data-testid="search-submit-button"]').click(), 0); }}
            className="px-3 py-1.5 text-xs uppercase tracking-wider font-bold border border-slate-300 hover:border-[#002FA7] hover:text-[#002FA7] transition rounded-sm"
            data-testid={`chip-${c}`}
          >
            {c}
          </button>
        ))}
      </div>

      {data && (
        <div className="animate-in">
          <div className="flex items-baseline gap-4 mb-6 section-rule pt-6">
            <h2 className="heading-display text-2xl">"{data.query}"</h2>
            <span className="label-tracked">{fmtNum(data.total)} RESULTS</span>
          </div>

          {data.total === 0 && (
            <div className="border border-slate-200 p-12 text-center text-slate-500 rounded-sm">
              No records match. Try a broader term.
            </div>
          )}

          {data.total > 0 && (
            <Tabs defaultValue="country" className="w-full">
              <TabsList className="bg-slate-100 rounded-sm p-1 h-auto" data-testid="search-tabs">
                <TabsTrigger value="country" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-[#002FA7] gap-2 text-xs uppercase tracking-wider font-bold py-2 px-4">
                  <MapPin className="h-3.5 w-3.5" /> By Country
                </TabsTrigger>
                <TabsTrigger value="buyer" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-[#002FA7] gap-2 text-xs uppercase tracking-wider font-bold py-2 px-4">
                  <Building2 className="h-3.5 w-3.5" /> By Buyer
                </TabsTrigger>
                <TabsTrigger value="exporter" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-[#002FA7] gap-2 text-xs uppercase tracking-wider font-bold py-2 px-4">
                  <Factory className="h-3.5 w-3.5" /> By Exporter
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-sm data-[state=active]:bg-white data-[state=active]:text-[#002FA7] text-xs uppercase tracking-wider font-bold py-2 px-4">
                  All Records
                </TabsTrigger>
              </TabsList>

              <TabsContent value="country" className="mt-6 space-y-4">
                {data.by_country.map((g) => <GroupSection key={g.key} group={g} segLabel="COUNTRY" />)}
              </TabsContent>
              <TabsContent value="buyer" className="mt-6 space-y-4">
                {data.by_buyer.map((g) => <GroupSection key={g.key} group={g} segLabel="BUYER" />)}
              </TabsContent>
              <TabsContent value="exporter" className="mt-6 space-y-4">
                {data.by_exporter.map((g) => <GroupSection key={g.key} group={g} segLabel="EXPORTER" />)}
              </TabsContent>
              <TabsContent value="all" className="mt-6 space-y-2">
                {data.records.map((r) => <RecordCard key={r.id} r={r} />)}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}

function GroupSection({ group, segLabel }) {
  // Detect dominant currency in group for price range display
  const currencies = [...new Set(group.records.map(r => r.currency || "USD"))];
  const dominantCur = currencies.length === 1 ? currencies[0] : "USD";
  const sym = currencySymbol(dominantCur);
  return (
    <div className="border border-slate-200 rounded-sm" data-testid={`group-${group.key}`}>
      <div className="flex items-center justify-between bg-slate-50 px-5 py-3 border-b border-slate-200 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="label-tracked">{segLabel}</span>
          <h3 className="heading-display text-lg">{group.key}</h3>
          <span className="text-xs text-slate-400 mono">· {group.count} shipment{group.count !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-6 text-xs">
          {group.min_price !== null && currencies.length === 1 && (
            <span className="text-slate-500">
              Price range <span className="mono font-bold text-slate-900">{sym}{group.min_price?.toFixed(2)}–{sym}{group.max_price?.toFixed(2)}</span>
            </span>
          )}
          {currencies.length > 1 && (
            <span className="text-slate-500">Mixed currencies</span>
          )}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {group.records.map((r) => <RecordCard key={r.id} r={r} compact />)}
      </div>
    </div>
  );
}

function RecordCard({ r, compact }) {
  const sym = currencySymbol(r.currency || "USD");
  return (
    <Link
      to={`/records/${r.id}`}
      className="block px-5 py-3 hover:bg-slate-50 transition group"
      data-testid={`record-row-${r.id}`}
    >
      <div className="grid grid-cols-12 gap-4 items-center text-sm">
        <div className="col-span-3">
          <div className="font-bold text-slate-900">{r.product_name}</div>
          <div className="text-xs text-slate-400">{r.product_category}</div>
        </div>
        <div className="col-span-3">
          <div className="font-semibold text-slate-900">{r.buyer_company}</div>
          <div className="text-xs text-slate-500 truncate">
            {r.buyer_name && `${r.buyer_name} · `}
            {r.buyer_city ? `${r.buyer_city}, ${r.buyer_country}` : r.buyer_country}
          </div>
        </div>
        <div className="col-span-3">
          <div className="font-semibold text-slate-700">{r.exporter_company}</div>
          <div className="text-xs text-slate-400 truncate">{r.exporter_name}</div>
        </div>
        <div className="col-span-2 text-right">
          <div className="mono font-bold text-slate-900">{sym}{r.unit_price?.toFixed(2)}<span className="text-xs text-slate-400 font-normal">/{r.unit}</span></div>
          <div className="text-xs text-slate-400 mono">qty {fmtNum(r.quantity)}</div>
        </div>
        <div className="col-span-1 text-right">
          <ArrowRight className="h-4 w-4 inline text-slate-300 group-hover:text-[#002FA7] transition" />
        </div>
      </div>
      {!compact && r.buyer_email && (
        <div className="text-xs text-slate-400 mt-1 mono">{r.buyer_email}</div>
      )}
    </Link>
  );
}
