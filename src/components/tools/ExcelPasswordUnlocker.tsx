import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Lock,
  Unlock,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Table,
} from "lucide-react";
import {
  unlockExcelFile,
  createSampleLockedExcel,
  UnlockResult,
} from "../../utils/excelUnlocker";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";

export default function ExcelPasswordUnlocker() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
      alert("Please upload an Excel spreadsheet (.xlsx, .xls)");
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setActiveSheetIdx(0);
  };

  const handleUnlock = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    try {
      const res = await unlockExcelFile(selectedFile);
      setResult(res);
    } catch (err: any) {
      alert("Error unlocking Excel file: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const loadSample = () => {
    const sample = createSampleLockedExcel();
    handleFileSelect(sample);
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.unlockedBlob, result.filename);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Excel Password & Protection Remover
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Upload password-locked or edit-restricted Excel workbooks to strip protection, unlock sheet access, and export clean .xlsx files.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        id="excel-drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
            : "border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            {selectedFile ? <Lock className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {selectedFile ? selectedFile.name : "Tap to choose Excel file or drag & drop"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Strips worksheet protection, workbook passwords, and structure locks (.xlsx, .xls)
            </p>
          </div>
          {selectedFile && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
              {formatFileSize(selectedFile.size)}
            </span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={loadSample}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center sm:justify-start gap-1.5 font-medium min-h-[36px]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Sample Protected Excel File</span>
        </button>

        <button
          id="btn-unlock-excel"
          onClick={handleUnlock}
          disabled={!selectedFile || processing}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-98"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Unlocking Excel Workbook...</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Remove Password & Unlock File</span>
            </>
          )}
        </button>
      </div>

      {/* Result Section */}
      {result && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
          {/* Header status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Excel Protection Removed Successfully!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Password locks and edit restrictions cleared. File is ready to view, edit, and save.
                </p>
              </div>
            </div>

            <button
              id="download-unlocked-excel-btn"
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Unlocked (.xlsx)</span>
            </button>
          </div>

          {/* Protections stripped summary */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Actions Applied:
            </span>
            <div className="flex flex-wrap gap-2">
              {result.protectionsRemoved.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Sheet Preview */}
          {result.sheets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Live Sheet Table Preview:
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {result.sheets.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        activeSheetIdx === idx
                          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {s.name} ({s.rowCount} rows)
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    {result.sheets[activeSheetIdx]?.previewData.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? "bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white sticky top-0"
                            : "border-t border-neutral-200 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                        }
                      >
                        <td className="p-2.5 text-[10px] text-neutral-400 font-mono w-8 text-center bg-neutral-50 dark:bg-neutral-850 border-r border-neutral-200 dark:border-neutral-800">
                          {rIdx + 1}
                        </td>
                        {row.map((cell: any, cIdx: number) => (
                          <td
                            key={cIdx}
                            className="p-2.5 text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800/60 last:border-r-0 whitespace-nowrap"
                          >
                            {cell !== undefined && cell !== null ? String(cell) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
