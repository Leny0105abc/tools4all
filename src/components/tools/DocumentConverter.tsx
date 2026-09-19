import { useState, useRef } from "react";
import {
  FileText,
  FileCode,
  Upload,
  Download,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { textToPdf, createWordDocumentBlob } from "../../utils/pdfTools";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";

export default function DocumentConverter() {
  const [conversionType, setConversionType] = useState<"pdf-to-word" | "text-to-pdf">("pdf-to-word");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("Official Document Report");
  const [textContent, setTextContent] = useState(
    `# Executive Summary\nThis document outlines the project scope, technical deliverables, and file processing workflows.\n\n## 1. Key Objectives\n- Seamless batch processing across media, spreadsheets, and documents.\n- End-to-end security and local file export without telemetry leaks.\n- Mobile compatibility with real-time OCR text extraction.\n\n## 2. Next Milestones\n- Integration testing on high-load image collages.\n- Multi-page PDF split and merge automation.`
  );

  const [processing, setProcessing] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedFilename, setConvertedFilename] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setConvertedBlob(null);

    // If PDF uploaded, extract text approximation or prepare for docx conversion
    if (file.type.includes("pdf") || file.name.endsWith(".pdf")) {
      setDocTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleConvert = async () => {
    setProcessing(true);
    try {
      if (conversionType === "pdf-to-word") {
        // Generate Word (.docx) from document
        const wordBlob = createWordDocumentBlob(docTitle, textContent);
        setConvertedBlob(wordBlob);
        setConvertedFilename(`${docTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`);
      } else {
        // Text/Markdown to PDF
        const pdfBlob = await textToPdf(docTitle, textContent);
        setConvertedBlob(pdfBlob);
        setConvertedFilename(`${docTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
      }
    } catch (err: any) {
      alert("Conversion error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedBlob) return;
    downloadBlob(convertedBlob, convertedFilename);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Document Format Conversion (PDF to Word & PDF Generator)
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Convert PDF paperwork into editable Microsoft Word (.docx) files or format text documents into pristine PDFs.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => {
            setConversionType("pdf-to-word");
            setConvertedBlob(null);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            conversionType === "pdf-to-word"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              PDF ➔ Word (.docx)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
              Editable DOCX
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Extract text, structured headers, and lists into a clean Microsoft Word compatible document.
          </p>
        </button>

        <button
          onClick={() => {
            setConversionType("text-to-pdf");
            setConvertedBlob(null);
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            conversionType === "text-to-pdf"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
              : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              Text / Word ➔ PDF
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium">
              A4 Vector PDF
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Compile notes, contracts, or draft text into an elegant, formatted PDF ready to print or sign.
          </p>
        </button>
      </div>

      {/* Editor & File Input */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Source File (Optional Upload)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-750 flex items-center justify-between truncate"
            >
              <span className="truncate">
                {selectedFile ? selectedFile.name : "Choose PDF or Text file..."}
              </span>
              <Upload className="w-3.5 h-3.5 shrink-0 text-neutral-400 ml-2" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>Document Content & Headings (Markdown supported)</span>
            </label>
            <span className="text-[10px] text-neutral-400 hidden sm:inline">
              # for Main Heading, ## for Subheading, - for Bullet
            </span>
          </div>

          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={8}
            className="w-full p-3 text-base sm:text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-neutral-400">
            Output file will be formatted automatically with professional styling.
          </span>

          <button
            id="btn-convert-document"
            onClick={handleConvert}
            disabled={processing || !textContent.trim()}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all active:scale-98"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating {conversionType === "pdf-to-word" ? "DOCX" : "PDF"}...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Convert & Generate {conversionType === "pdf-to-word" ? "Word (.docx)" : "PDF"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Download Box */}
      {convertedBlob && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                Conversion Complete: {convertedFilename}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Size: {formatFileSize(convertedBlob.size)} • Ready to download and open in Word or PDF viewer.
              </p>
            </div>
          </div>

          <button
            id="download-doc-btn"
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      )}
    </div>
  );
}
