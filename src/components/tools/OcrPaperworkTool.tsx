import { useState, useRef } from "react";
import {
  ScanText,
  Camera,
  Upload,
  Copy,
  Check,
  Download,
  Loader2,
  FileText,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Eye,
  Edit3,
} from "lucide-react";
import { textToPdf, createWordDocumentBlob } from "../../utils/pdfTools";
import { downloadBlob } from "../../utils/audioConverter";

export default function OcrPaperworkTool() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [metadata, setMetadata] = useState<{
    wordCount: number;
    lineCount: number;
    confidence: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleImage = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExtractedText("");
    setMetadata(null);
  };

  const runOcr = async () => {
    if (!imageFile) return;
    setProcessing(true);

    try {
      // Read as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        try {
          const res = await fetch("/api/gemini/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: imageFile.type || "image/jpeg",
            }),
          });
          const data = await res.json();
          if (data.extractedText) {
            setExtractedText(data.extractedText);
            setDocumentType(data.documentType || "Scanned Paperwork");
            setMetadata(data.metadata || null);
          }
        } catch (err: any) {
          alert("OCR recognition error: " + err.message);
        } finally {
          setProcessing(false);
        }
      };
      reader.readAsDataURL(imageFile);
    } catch (err: any) {
      alert("Failed reading image: " + err.message);
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWord = () => {
    const docBlob = createWordDocumentBlob(documentType || "Scanned_Document_OCR", extractedText);
    downloadBlob(docBlob, `${documentType.replace(/[^a-zA-Z0-9_-]/g, "_") || "ocr_paperwork"}.docx`);
  };

  const handleDownloadPdf = async () => {
    const pdfBlob = await textToPdf(documentType || "Scanned Document OCR", extractedText);
    downloadBlob(pdfBlob, `${documentType.replace(/[^a-zA-Z0-9_-]/g, "_") || "ocr_paperwork"}.pdf`);
  };

  const loadSampleScannedInvoice = () => {
    // Generate a realistic scanned document canvas with invoice text
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d")!;

    // Paper background with warm subtle tint
    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, 1200, 1600);

    // Document header
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 44px 'Courier New', monospace";
    ctx.fillText("APEX GLOBAL SOLUTIONS INC.", 120, 150);

    ctx.font = "24px 'Courier New', monospace";
    ctx.fillStyle = "#64748B";
    ctx.fillText("INVOICE NO: INV-2026-8941", 120, 210);
    ctx.fillText("DATE: September 19, 2026", 120, 250);
    ctx.fillText("BILL TO: Acquired Logistics Corp", 120, 290);

    // Line separator
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, 340);
    ctx.lineTo(1080, 340);
    ctx.stroke();

    // Table Header
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillText("ITEM DESCRIPTION", 120, 390);
    ctx.fillText("QTY", 650, 390);
    ctx.fillText("RATE", 780, 390);
    ctx.fillText("TOTAL", 940, 390);

    // Rows
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillStyle = "#334155";
    const items = [
      ["Cloud Infrastructure Migration", "1", "$4,800.00", "$4,800.00"],
      ["Database Sharding & Optimization", "24 hrs", "$125.00", "$3,000.00"],
      ["Security Audit & Penetration Test", "1", "$2,450.00", "$2,450.00"],
      ["SSL & Multi-Region Setup", "1", "$750.00", "$750.00"],
    ];

    items.forEach((item, i) => {
      const y = 450 + i * 60;
      ctx.fillText(item[0], 120, y);
      ctx.fillText(item[1], 650, y);
      ctx.fillText(item[2], 780, y);
      ctx.fillText(item[3], 940, y);
    });

    // Total box
    ctx.beginPath();
    ctx.moveTo(120, 720);
    ctx.lineTo(1080, 720);
    ctx.stroke();

    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("BALANCE DUE (USD):", 600, 780);
    ctx.fillText("$11,000.00", 910, 780);

    // Simulated signature
    ctx.font = "italic 32px 'Brush Script MT', cursive, sans-serif";
    ctx.fillStyle = "#1E40AF";
    ctx.fillText("Authorized Signature: Jonathan Vance", 120, 920);

    canvas.toBlob((b) => {
      if (b) {
        const file = new File([b], "Scanned_Apex_Invoice_Sample.jpg", { type: "image/jpeg" });
        handleImage(file);
      }
    }, "image/jpeg");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <ScanText className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Scanned Paperwork OCR & Instant Document Editor
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Capture paperwork with mobile camera or upload scanned documents to instantly extract text, tables, and edit in real-time.
        </p>
      </div>

      {/* Upload & Mobile Camera Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upload File */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleImage(e.target.files[0]);
            }}
          />
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
            Upload Paperwork / Scan Image
          </span>
          <span className="text-[11px] text-neutral-400">
            Invoices, contracts, receipts, forms
          </span>
        </div>

        {/* Mobile Camera Direct Capture */}
        <div
          onClick={() => cameraInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
        >
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleImage(e.target.files[0]);
            }}
          />
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
            Mobile Camera Instant Scan
          </span>
          <span className="text-[11px] text-neutral-400">
            Tap to open camera and snap paperwork on the go
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={loadSampleScannedInvoice}
          className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Sample Scanned Invoice Document</span>
        </button>

        {imageFile && (
          <button
            id="btn-run-ocr"
            onClick={runOcr}
            disabled={processing}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-teal-600/20 disabled:opacity-50 transition-all active:scale-98"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Text via AI OCR...</span>
              </>
            ) : (
              <>
                <ScanText className="w-4 h-4" />
                <span>Extract Text & Tables (AI OCR)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Dual Pane: Scanned Image vs Instant Editor */}
      {(imagePreview || extractedText) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Original Scanned Document */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                <span>Scanned Paperwork Source</span>
              </span>
              {imageFile && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {imageFile.name}
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[360px] max-h-[500px] overflow-auto rounded-xl bg-neutral-100 dark:bg-neutral-800/40 p-2 flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Scanned Document"
                  className="max-h-full max-w-full object-contain rounded shadow-xs"
                />
              ) : (
                <span className="text-xs text-neutral-400">No image loaded</span>
              )}
            </div>
          </div>

          {/* Right: Instant Document Editor */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Instant Document Editor
                </span>
                {documentType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-medium">
                    {documentType}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  disabled={!extractedText}
                  className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs flex items-center gap-1 disabled:opacity-40"
                  title="Copy Text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={handleDownloadWord}
                  disabled={!extractedText}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 border border-blue-200 dark:border-blue-900/50 disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  <span>Word</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={!extractedText}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <textarea
              id="ocr-text-editor"
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Extracted text from paperwork will appear here. You can freely edit, reformat, and add notes."
              rows={14}
              className="w-full flex-1 p-3 text-base sm:text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
            />

            {metadata && (
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                <span>Words: {metadata.wordCount} • Lines: {metadata.lineCount}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  OCR Accuracy: {metadata.confidence}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
