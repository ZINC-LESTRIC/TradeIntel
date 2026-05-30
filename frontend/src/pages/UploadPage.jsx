import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, FileImage, X, Save } from "lucide-react";

const FIELDS = [
  ["exporter_name", "Exporter Name"],
  ["exporter_company", "Exporter Company"],
  ["exporter_address", "Exporter Address"],
  ["exporter_country", "Exporter Country"],
  ["buyer_name", "Buyer Name"],
  ["buyer_company", "Buyer Company"],
  ["buyer_address", "Buyer Address"],
  ["buyer_city", "Buyer City"],
  ["buyer_country", "Buyer Country"],
  ["buyer_email", "Buyer Email"],
  ["product_name", "Product Name"],
  ["product_category", "Product Category"],
  ["unit_price", "Unit Price"],
  ["currency", "Currency (USD/EUR/GBP...)"],
  ["quantity", "Quantity"],
  ["unit", "Unit (pcs/kg/sets...)"],
  ["total_value", "Total Value"],
  ["gross_weight_kg", "Gross Weight (kg)"],
  ["cartons", "Cartons"],
  ["shipment_date", "Shipment Date"],
  ["gd_number", "GD #"],
  ["invoice_number", "Invoice #"],
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const onSelect = (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) {
      toast.error("Please use JPG, PNG or WEBP");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setData(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    onSelect(e.dataTransfer.files?.[0]);
  };

  const extract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/extract", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setData(data.extracted);
      toast.success("Extracted! Review and save.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: rec } = await api.post("/records", data);
      toast.success("Record saved");
      navigate(`/records/${rec.id}`);
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setData(null); };

  return (
    <div className="p-8 lg:p-12 max-w-[1400px]" data-testid="upload-page">
      <div className="mb-8">
        <div className="label-tracked mb-3">AI EXTRACTION</div>
        <h1 className="heading-display text-4xl">Upload trade document</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl">
          Drop an invoice, packing list, BL or purchase order. Gemini Vision reads it and pre-fills every field. Edit and save.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone */}
        <div>
          {!preview ? (
            <div
              className={`dropzone ${drag ? "active" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              data-testid="dropzone"
            >
              <Upload className="h-10 w-10 mx-auto text-slate-400 mb-4" />
              <div className="heading-display text-xl mb-2">Drop document here</div>
              <div className="text-sm text-slate-500 mb-4">or click to browse · JPG, PNG, WEBP</div>
              <Button variant="outline" className="rounded-sm" data-testid="browse-button">
                <FileImage className="h-4 w-4 mr-2" /> Browse files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onSelect(e.target.files?.[0])}
                className="hidden"
                data-testid="file-input"
              />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-sm p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold truncate">{file.name}</div>
                <button onClick={reset} className="text-slate-400 hover:text-[#E53935]" data-testid="reset-upload">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img src={preview} alt="preview" className="w-full max-h-[420px] object-contain bg-white border border-slate-200" />
              <Button
                onClick={extract}
                disabled={extracting}
                className="w-full mt-4 h-11 rounded-sm bg-[#002FA7] hover:bg-[#00227A]"
                data-testid="extract-button"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {extracting ? "Reading document..." : "Extract with AI"}
              </Button>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="border border-slate-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-display text-lg">Extracted record</h3>
            {data && <span className="label-tracked text-[#10B981]">READY TO SAVE</span>}
          </div>

          {!data && (
            <div className="text-center text-sm text-slate-400 py-12">
              Extracted fields will appear here. Review then save.
            </div>
          )}

          {data && (
            <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-auto pr-1" data-testid="extracted-form">
              {FIELDS.map(([key, label]) => (
                <div key={key} className={["exporter_address", "buyer_address", "notes"].includes(key) ? "col-span-2" : ""}>
                  <Label className="label-tracked">{label}</Label>
                  {key.includes("address") ? (
                    <Textarea
                      value={data[key] || ""}
                      onChange={(e) => setData({ ...data, [key]: e.target.value })}
                      className="rounded-sm mt-1.5 text-sm"
                      rows={2}
                      data-testid={`field-${key}`}
                    />
                  ) : (
                    <Input
                      type={["unit_price", "quantity", "total_value", "gross_weight_kg", "cartons"].includes(key) ? "number" : "text"}
                      step="0.01"
                      value={data[key] ?? ""}
                      onChange={(e) => setData({ ...data, [key]: ["unit_price", "quantity", "total_value", "gross_weight_kg", "cartons"].includes(key) ? parseFloat(e.target.value) || 0 : e.target.value })}
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
                <Button onClick={reset} variant="outline" className="rounded-sm" data-testid="discard-button">Discard</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
