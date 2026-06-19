import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, FileImage, X, Save, ExternalLink, Plus } from "lucide-react";

// Strict field set per spec - buyer-side only, no exporter, no GD/invoice/freight
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
  ["notes", "Notes (your own input)", "textarea", true],
];

const NUMERIC = new Set(["unit_price", "quantity", "total_value"]);

export default function UploadPage() {
  const [files, setFiles] = useState([]); // [{file, preview}]
  const [extracting, setExtracting] = useState(false);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter((f) =>
      /^image\/(jpeg|jpg|png|webp)$/i.test(f.type)
    );
    if (incoming.length === 0) {
      toast.error("Please use JPG, PNG or WEBP images");
      return;
    }
    const next = [...files, ...incoming.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))];
    if (next.length > 8) {
      toast.error("Maximum 8 documents per extraction");
      return;
    }
    setFiles(next);
    setData(null);
  };

  const removeFile = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setData(null);
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
      // Send only the allowed fields - backend model accepts them and ignores any extra
      const payload = FIELDS.reduce((acc, [k]) => ({ ...acc, [k]: data[k] ?? (NUMERIC.has(k) ? 0 : "") }), {});
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
  };

  const ensureUrl = (u) => {
    if (!u) return "";
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
  };

  return (
    <div className="p-8 lg:p-12 max-w-[1400px]" data-testid="upload-page">
      <div className="mb-8">
        <div className="label-tracked mb-3">AI EXTRACTION</div>
        <h1 className="heading-display text-4xl">Upload trade documents</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">
          Drop one or more documents together — GD, Invoice, Packing List in any combination. Gemini Vision will read all of them and consolidate buyer-side data into one record. Exporter info, GD#, and freight charges are deliberately ignored.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone + thumbnails */}
        <div className="space-y-3">
          <div
            className={`dropzone ${drag ? "active" : ""}`}
            onClick={() => inputRef.current?.click()}
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
            <Button type="button" variant="outline" className="rounded-sm" data-testid="browse-button">
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
            <div className="border border-slate-200 rounded-sm p-4 bg-slate-50 space-y-3" data-testid="file-list">
              <div className="flex items-center justify-between">
                <span className="label-tracked">DOCUMENTS ({files.length})</span>
                <button onClick={reset} className="text-xs text-slate-400 hover:text-[#E53935] uppercase tracking-wider font-bold" data-testid="reset-upload">
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map((f, idx) => (
                  <div key={idx} className="relative group" data-testid={`file-thumb-${idx}`}>
                    <img src={f.preview} alt="" className="w-full aspect-square object-cover bg-white border border-slate-200" />
                    <button
                      onClick={() => removeFile(idx)}
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
                className="w-full h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A]"
                data-testid="extract-button"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {extracting ? `Reading ${files.length} document${files.length > 1 ? "s" : ""}...` : `Extract from ${files.length} document${files.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
        </div>

        {/* Editable form */}
        <div className="border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-display text-lg">Extracted record</h3>
            {data && <span className="label-tracked text-[#10B981]">READY TO SAVE</span>}
          </div>

          {!data && (
            <div className="text-center text-sm text-slate-400 py-12">
              Buyer-side fields will appear here after extraction. <br />
              <span className="text-xs">Exporter info, GD#, and freight charges are ignored by design.</span>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-auto pr-1" data-testid="extracted-form">
              {FIELDS.map(([key, label, type, fullWidth]) => (
                <div key={key} className={fullWidth ? "col-span-2" : ""}>
                  <div className="flex items-center justify-between">
                    <Label className="label-tracked">{label}</Label>
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
                      placeholder={key === "notes" ? "Add your own notes here (optional)..." : ""}
                      data-testid={`field-${key}`}
                    />
                  ) : (
                    <Input
                      type={NUMERIC.has(key) ? "number" : type === "url" ? "text" : "text"}
                      step="0.01"
                      value={data[key] ?? ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          [key]: NUMERIC.has(key) ? parseFloat(e.target.value) || 0 : e.target.value,
                        })
                      }
                      placeholder={type === "url" ? "www.example.com" : ""}
                      className="rounded-sm mt-1.5 h-9 text-sm"
                      data-testid={`field-${key}`}
                    />
                  )}
                </div>
              ))}

              <div className="col-span-2 mt-3 pt-3 border-t border-slate-200 flex gap-2">
                <Button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 h-10 rounded-sm bg-[#002FA7] hover:bg-[#00227A]"
                  data-testid="save-record-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save to database"}
                </Button>
                <Button onClick={reset} variant="outline" className="rounded-sm" data-testid="discard-button">
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
