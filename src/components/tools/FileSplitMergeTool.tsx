import { useState, useRef } from "react";
import {
  GitFork,
  Merge,
  Split,
  Upload,
  Download,
  CheckCircle2,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Sparkles,
  Archive,
} from "lucide-react";
import JSZip from "jszip";
import { mergePdfFiles, splitPdfFile, textToPdf } from "../../utils/pdfTools";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";

export default function FileSplitMergeTool() {
  const [activeMode, setActiveMode] = useState<"merge" | "split">("merge");

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergedResultBlob, setMergedResultBlob] = useState<Blob | null>(null);

  // Split State
  const [splitSourceFile, setSplitSourceFile] = useState<File | null>(null);
  const [pageRangesInput, setPageRangesInput] = useState("1-1, 2-3");
  const [splitting, setSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<
    { filename: string; blob: Blob; pageCount: number }[]
  >([]);

  const mergeInputRef = useRef<HTMLInputElement | null>(null);
  const splitInputRef = useRef<HTMLInputElement | null>(null);

  // Handle files to merge
  const handleAddMergeFiles = (files: FileList | File[]) => {
    const valid = Array.from(files).filter(
      (f) => f.type.includes("pdf") || f.name.endsWith(".pdf") || f.name.match(/\.(txt|csv|md)$/i)
    );
    if (valid.length === 0) {
      alert("Please upload PDF or Text/CSV files to merge.");
      return;
    }
    setMergeFiles((prev) => [...prev, ...valid]);
    setMergedResultBlob(null);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const updated = [...mergeFiles];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setMergeFiles(updated);
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      alert("Please add at least 2 files to merge.");
      return;
    }
    setMerging(true);
    try {
      const isAllPdf = mergeFiles.every((f) => f.name.endsWith(".pdf") || f.type.includes("pdf"));

      if (isAllPdf) {
        const mergedBlob = await mergePdfFiles(mergeFiles);
        setMergedResultBlob(mergedBlob);
      } else {
        // Merge text/CSV files
        const textParts: string[] = [];
        for (const file of mergeFiles) {
          const text = await file.text();
          textParts.push(`\n--- [FILE: ${file.name}] ---\n` + text);
        }
        const mergedText = textParts.join("\n");
        const blob = new Blob([mergedText], { type: "text/plain;charset=utf-8" });
        setMergedResultBlob(blob);
      }
    } catch (err: any) {
      alert("Merge error: " + err.message);
    } finally {
      setMerging(false);
    }
  };

  // Handle Split
  const executeSplit = async () => {
    if (!splitSourceFile) return;
    setSplitting(true);
    setSplitResults([]);

    try {
      if (splitSourceFile.name.endsWith(".pdf")) {
        // Parse user ranges like "1-2, 3-4"
        const ranges = pageRangesInput
          .split(",")
          .map((part) => {
            const trimmed = part.trim();
            if (trimmed.includes("-")) {
              const [start, end] = trimmed.split("-").map(Number);
              return { startPage: start || 1, endPage: end || start || 1 };
            }
            const single = Number(trimmed) || 1;
            return { startPage: single, endPage: single };
          })
          .filter((r) => !isNaN(r.startPage));

        const results = await splitPdfFile(splitSourceFile, ranges);
        setSplitResults(results);
      } else {
        // Text / CSV split
        const text = await splitSourceFile.text();
        const lines = text.split("\n");
        const linesPerChunk = 100;
        const results: { filename: string; blob: Blob; pageCount: number }[] = [];

        for (let i = 0; i < lines.length; i += linesPerChunk) {
          const chunk = lines.slice(i, i + linesPerChunk).join("\n");
          const partIndex = Math.floor(i / linesPerChunk) + 1;
          results.push({
            filename: `${splitSourceFile.name.replace(/\.[^/.]+$/, "")}_part_${partIndex}.txt`,
            blob: new Blob([chunk], { type: "text/plain" }),
            pageCount: Math.min(linesPerChunk, lines.length - i),
          });
        }
        setSplitResults(results);
      }
    } catch (err: any) {
      alert("Split error: " + err.message);
    } finally {
      setSplitting(false);
    }
  };

  const downloadAllSplitZip = async () => {
    if (splitResults.length === 0) return;
    const zip = new JSZip();
    splitResults.forEach((r) => zip.file(r.filename, r.blob));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "split_files_archive.zip");
  };

  const loadSamplePdfForSplit = async () => {
    const sampleBlob = await textToPdf(
      "Multi-Page Project Handbook",
      "# Chapter 1: Introduction\nOverview of the distributed systems architecture.\n\n# Chapter 2: Specifications\nProtocol buffers, API gateway, and edge caching rules.\n\n# Chapter 3: Deployment\nKubernetes manifests and Cloud Run cluster deployments.\n\n# Chapter 4: Security and Audit\nGranular role permissions and file encryption standards."
    );
    const file = new File([sampleBlob], "Project_Handbook_4Pages.pdf", { type: "application/pdf" });
    setSplitSourceFile(file);
    setPageRangesInput("1-2, 3-4");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <GitFork className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            File Splitting & Merging Suite
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Combine multiple PDFs and datasets into unified files or split multi-page paperwork into customized extracts.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 max-w-xs">
        <button
          onClick={() => setActiveMode("merge")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeMode === "merge"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Merge className="w-3.5 h-3.5" />
          <span>Merge Files</span>
        </button>
        <button
          onClick={() => setActiveMode("split")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeMode === "split"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Split className="w-3.5 h-3.5" />
          <span>Split Files</span>
        </button>
      </div>

      {/* MERGE VIEW */}
      {activeMode === "merge" && (
        <div className="space-y-4">
          <div
            onClick={() => mergeInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-all"
          >
            <input
              ref={mergeInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.csv,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleAddMergeFiles(e.target.files);
              }}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Merge className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Add PDFs or Text files to merge
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Drag to rearrange execution order
              </p>
            </div>
          </div>

          {mergeFiles.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Merge Order ({mergeFiles.length} files)
                </span>
                <button
                  onClick={() => setMergeFiles([])}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {mergeFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white truncate max-w-sm">
                          {file.name}
                        </p>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveItem(idx, "up")}
                        disabled={idx === 0}
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 disabled:opacity-30 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, "down")}
                        disabled={idx === mergeFiles.length - 1}
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 disabled:opacity-30 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeMergeFile(idx)}
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  id="btn-execute-merge"
                  onClick={executeMerge}
                  disabled={merging || mergeFiles.length < 2}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-purple-600/20 disabled:opacity-50 transition-all active:scale-98"
                >
                  {merging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Merging Documents...</span>
                    </>
                  ) : (
                    <>
                      <Merge className="w-4 h-4" />
                      <span>Merge into Single Unified Document</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {mergedResultBlob && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Files Merged Successfully!
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Combined size: {formatFileSize(mergedResultBlob.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  downloadBlob(
                    mergedResultBlob,
                    mergeFiles[0]?.name.endsWith(".pdf") ? "unified_merged_document.pdf" : "unified_merged_data.txt"
                  )
                }
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Download Merged File</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SPLIT VIEW */}
      {activeMode === "split" && (
        <div className="space-y-4">
          <div
            onClick={() => splitInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-center cursor-pointer transition-all"
          >
            <input
              ref={splitInputRef}
              type="file"
              accept=".pdf,.txt,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setSplitSourceFile(e.target.files[0]);
              }}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Split className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {splitSourceFile ? splitSourceFile.name : "Select PDF or Text file to split"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Split by page numbers (e.g. 1-2, 3-5) or line count
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={loadSamplePdfForSplit}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample 4-Page PDF Document</span>
            </button>
          </div>

          {splitSourceFile && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Page Ranges (Comma separated, e.g. 1-2, 3-4, 5)
                </label>
                <input
                  type="text"
                  value={pageRangesInput}
                  onChange={(e) => setPageRangesInput(e.target.value)}
                  placeholder="1-2, 3-4"
                  className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  id="btn-execute-split"
                  onClick={executeSplit}
                  disabled={splitting}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-98"
                >
                  {splitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Splitting Document...</span>
                    </>
                  ) : (
                    <>
                      <Split className="w-4 h-4" />
                      <span>Execute Split</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {splitResults.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Split Output ({splitResults.length} parts)
                </span>
                <button
                  onClick={downloadAllSplitZip}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Download All as ZIP</span>
                </button>
              </div>

              <div className="space-y-2">
                {splitResults.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white">{r.filename}</p>
                        <span className="text-[10px] text-neutral-400">
                          {formatFileSize(r.blob.size)} • {r.pageCount} page{r.pageCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadBlob(r.blob, r.filename)}
                      className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
