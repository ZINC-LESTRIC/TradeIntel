import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, FileImage, X, Save, ExternalLink, Loader2, Wand2, Layers } from "lucide-react";
import { currencySymbol, fmtNum } from "@/lib/format";

const FIELDS = [
  ["buyer_name", "Buyer Name", "text", false],
  ["buyer_company", "Buyer Company", "text", false],
  ["buyer_address", "Buyer Address", "textarea", true],
  ["buyer_city", "Buyer City", "text", false],
  ["buyer_country", "Buyer Country", "text", false],
  ["buyer_email", "Buyer Email", "text", false],
  ["buyer_website", "Buyer Website", "url", true],
  ["product_name", "Product Description", "text", true],
  ["product_category", "Product Category (auto-detect)", "text", false],
  ["hs_code", "HS Code", "text", false],
  ["quantity", "Quantity", "number", false],
  ["unit", "Unit (pcs/kg/sets)", "text", false],
  ["unit_price", "Unit Price", "number", false],
  ["currency", "Currency (USD/EUR/GBP)", "text", false],
  ["total_value", "Total Value (product only)", "number", false],
  ["shipment_date", "Shipment Date", "text", false],
];

const NUMERIC = new Set(["unit_price", "quantity", "total_value"]);

function buildAutoNote(d) {
  if (!d) return "";
  const company = d.buyer_company || d.buyer_name || "Buyer";
  const country = d.buyer_country || "Unknown country";
  const qty = d.quantity ? `${fmtNum(d.quantity)} ${d.unit || "units"}` : "shipment";
  const product = d.product_name || "goods";
  const cur = d.currency || "";
  const total = d.total_value ? `${currencySymbol(cur)}${fmtNum(d.total_value)}` : "(value not specified)";
  const date = d.shipment_date ? ` on ${d.shipment_date}` : "";
  const email = d.buyer_email ? ` Contact: ${d.buyer_email}` : "";
  return `${company} from ${country} imported ${qty} of ${product} worth ${total}${date}.${email}`;
}

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter((f) =>
      /^image\/(jpeg|jpg|png|webp)$/i.test(f.type)
    );
    if (incoming.length === 0) { toast.error("Please use JPG, PNG or WEBP images"); return; }
    const next = [...files, ...incoming.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))];
    if (next.length > 8) { toast.error("Maximum 8 documents per extraction"); return; }
    setFiles(next);
    setData(null);
    setNotes("");
  };

  const removeFile = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setData(null);
    setNotes("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const extract = async () => {
    if (files.length === 0) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      files.forEach(({ file }) => fd.append("files", file));
      const { data: resp } = await api.post("/extract", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setData(resp.extracted);
      setNotes(buildAutoNote(resp.extracted));
      toast.success(`Extracted from ${resp.files} document${resp.files > 1 ? "s" : ""}. Review and save.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = FIELDS.reduce((acc, [k]) => ({ ...acc, [k]: data[k] ?? (NUMERIC.has(k) ? 0 : "") }), {});
      payload.notes = notes;
      payload.line_items = data.line_items || [];
      const { data: rec } = await api.post("/records", payload);
      toast.success("Record saved");
      navigate(`/records/${rec.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setData(null);
    setNotes("");
  };

  const ensureUrl = (u) => !u ? "" : (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  const regenNotes = () => setNotes(buildAutoNote(data));

  // Derived: auto-calculated unit price hint + line items
  const lineItems = data?.line_items || [];
  const hasMultiItems = lineItems.length > 1;
  const autoUnitPrice = useMemo(() => {
    if (!data) return 0;
    if (data.unit_price > 0) return 0; // already explicit
    if (data.total_value > 0 && data.quantity > 0) return data.total_value / data.quantity;
    return 0;
  }, [data]);

  return (
    <div className="p-8 lg:p-12 max-w-[1400px] page-fade-in" data-testid="upload-page">
      <div className="mb-8">
        <div className="label-tracked mb-3">AI EXTRACTION</div>
        <h1 className="heading-display text-4xl">Upload trade documents</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">
          Drop one or more documents together — GD, Invoice, Packing List in any combination. Gemini Vision will read all of them and consolidate buyer-side data into one record. Exporter info, GD#, and freight charges are deliberately ignored.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone */}
        <div className="space-y-3">
          <div
            className={`dropzone ${drag ? "active" : ""} ${extracting ? "pointer-events-none opacity-60" : ""}`}
            onClick={() => !extracting && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            data-testid="dropzone"
          >
            <Upload className="h-10 w-10 mx-auto text-slate-400 mb-4" />
            <div className="heading-display text-xl mb-2">
              {files.length === 0 ? "Drop documents here" : `${files.length} document${files.length > 1 ? "s" : ""} ready · drop more`}
            </div>
            <div className="text-sm text-slate-500 mb-4">JPG, PNG, WEBP · up to 8 files</div>
            <Button type="button" variant="outline" className="rounded-sm hover-lift" data-testid="browse-button">
              <FileImage className="h-4 w-4 mr-2" /> {files.length === 0 ? "Browse files" : "Add more"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
              data-testid="file-input"
            />
          </div>

          {files.length > 0 && (
            <div className="border border-slate-200 rounded-sm p-4 bg-slate-50 space-y-3 animate-in" data-testid="file-list">
              <div className="flex items-center justify-between">
                <span className="label-tracked">DOCUMENTS ({files.length})</span>
                <button onClick={reset} disabled={extracting} className="text-xs text-slate-400 hover:text-[#E53935] uppercase tracking-wider font-bold disabled:opacity-40" data-testid="reset-upload">
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map((f, idx) => (
                  <div key={idx} className="relative group" data-testid={`file-thumb-${idx}`}>
                    <img src={f.preview} alt="" className="w-full aspect-square object-cover bg-white border border-slate-200" />
                    <button
                      onClick={() => removeFile(idx)}
                      disabled={extracting}
                      className="absolute top-1 right-1 bg-white/95 border border-slate-300 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:border-[#E53935] hover:text-[#E53935]"
                      data-testid={`remove-file-${idx}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="text-[10px] text-slate-500 truncate mt-1 mono">{f.file.name}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={extract}
                disabled={extracting}
                className="w-full h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A] transition hover-lift"
                data-testid="extract-button"
              >
                {extracting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reading {files.length} document{files.length > 1 ? "s" : ""}...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Extract from {files.length} document{files.length > 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          )}

          {extracting && (
            <div className="border border-slate-200 rounded-sm p-6 bg-white flex items-center gap-4 animate-in" data-testid="extracting-loader">
              <Loader2 className="h-6 w-6 text-[#002FA7] animate-spin shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900">Gemini Vision is reading your documents</div>
                <div className="text-xs text-slate-500 mt-0.5">Identifying buyer · pricing · HS code · line items. Usually 10–20s.</div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-display text-lg">Extracted record</h3>
            {data && <span className="label-tracked text-[#10B981]">READY TO SAVE</span>}
          </div>

          {!data && !extracting && (
            <div className="text-center text-sm text-slate-400 py-12">
              Buyer-side fields will appear here after extraction. <br />
              <span className="text-xs">Exporter info, GD#, and freight charges are ignored by design.</span>
            </div>
          )}

          {data && (
            <div className="space-y-4 max-h-[640px] overflow-auto pr-1" data-testid="extracted-form">
              {/* Line items breakdown if multiple */}
              {hasMultiItems && (
                <div className="border border-slate-200 rounded-sm p-3 bg-slate-50" data-testid="line-items-block">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-3.5 w-3.5 text-[#002FA7]" />
                    <span className="label-tracked">LINE ITEMS · {lineItems.length} products</span>
                  </div>
                  <div className="text-sm leading-relaxed">
                    {lineItems.map((it, i) => {
                      const sym = currencySymbol(it.currency || data.currency || "USD");
                      const price = it.unit_price ? `${sym}${it.unit_price.toFixed(2)}` : (it.total_value && it.quantity ? `Auto: ${sym}${(it.total_value / it.quantity).toFixed(2)}` : "—");
                      return (
                        <span key={i} className="mono" data-testid={`line-item-${i}`}>
                          <span className="font-bold text-slate-900">{it.product_name || `Item ${i + 1}`}</span>
                          : <span className="text-[#002FA7]">{price}/{it.unit || "pc"}</span>
                          {i < lineItems.length - 1 && <span className="text-slate-300 mx-1.5">|</span>}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 italic">
                    Top-level unit price left blank for mixed line items. Total value is the sum across all items.
                  </div>
                </div>
              )}

              {/* Standard form grid */}
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map(([key, label, type, fullWidth]) => (
                  <div key={key} className={fullWidth ? "col-span-2" : ""}>
                    <div className="flex items-center justify-between">
                      <Label className="label-tracked">{label}</Label>
                      {key === "unit_price" && !hasMultiItems && autoUnitPrice > 0 && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[#10B981] flex items-center gap-1" data-testid="auto-price-hint">
                          <Wand2 className="h-2.5 w-2.5" /> Auto: {currencySymbol(data.currency)}{autoUnitPrice.toFixed(2)}/{data.unit || "pc"}
                        </span>
                      )}
                      {key === "buyer_website" && data[key] && (
                        <a
                          href={ensureUrl(data[key])}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] uppercase tracking-wider font-bold text-[#002FA7] hover:underline flex items-center gap-1"
                          data-testid="open-website-link"
                        >
                          Open <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {type === "textarea" ? (
                      <Textarea
                        value={data[key] || ""}
                        onChange={(e) => setData({ ...data, [key]: e.target.value })}
                        className="rounded-sm mt-1.5 text-sm"
                        rows={2}
                        data-testid={`field-${key}`}
                      />
                    ) : (
                      <Input
                        type={NUMERIC.has(key) ? "number" : "text"}
                        step="0.01"
                        value={key === "unit_price" && hasMultiItems ? "" : (data[key] ?? "")}
                        placeholder={
                          key === "unit_price" && hasMultiItems ? "Multiple line items — see breakdown above"
                          : key === "unit_price" && autoUnitPrice > 0 ? `Auto-calc: ${currencySymbol(data.currency)}${autoUnitPrice.toFixed(2)}`
                          : type === "url" ? "www.example.com"
                          : ""
                        }
                        onChange={(e) =>
                          setData({
                            ...data,
                            [key]: NUMERIC.has(key) ? parseFloat(e.target.value) || 0 : e.target.value,
                          })
                        }
                        disabled={key === "unit_price" && hasMultiItems}
                        className={`rounded-sm mt-1.5 h-9 text-sm ${key === "unit_price" && hasMultiItems ? "bg-slate-50 text-slate-400" : ""}`}
                        data-testid={`field-${key}`}
                      />
                    )}
                  </div>
                ))}

                {/* Notes with auto-fill */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="label-tracked">Notes (auto-generated · editable)</Label>
                    <button
                      type="button"
                      onClick={regenNotes}
                      className="text-[10px] uppercase tracking-wider font-bold text-[#002FA7] hover:underline flex items-center gap-1"
                      data-testid="regen-notes-button"
                    >
                      <Wand2 className="h-2.5 w-2.5" /> Regenerate
                    </button>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-sm mt-1.5 text-sm"
                    placeholder="Auto-generated summary will appear here..."
                    data-testid="field-notes"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1 h-10 rounded-sm bg-[#002FA7] hover:bg-[#00227A] hover-lift transition" data-testid="save-record-button">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? "Saving..." : "Save to database"}
                </Button>
                <Button onClick={reset} variant="outline" className="rounded-sm" data-testid="discard-button">Discard</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
