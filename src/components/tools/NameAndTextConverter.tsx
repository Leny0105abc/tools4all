import { useState } from "react";
import {
  ArrowLeftRight,
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
  FileText,
  RotateCcw,
  Wand2,
  ListOrdered,
  Layers,
} from "lucide-react";
import { TextConversionSuggestion } from "../../types";

export default function NameAndTextConverter() {
  const sampleNames = `Smith, John Michael
Doe, Jane Marie
Johnson, Robert Alexander
Williams, Patricia Anne
Brown, James David`;

  const [inputText, setInputText] = useState(sampleNames);
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeMode, setActiveMode] = useState<"last-first" | "first-last" | "ai-suggest">("last-first");
  const [customGoal, setCustomGoal] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<TextConversionSuggestion | null>(null);

  // Convert "LastName, FirstName MiddleName" to "FirstName MiddleName LastName"
  const convertLastFirstToFirstLast = () => {
    setActiveMode("last-first");
    const lines = inputText.split("\n");
    const converted = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        const parts = trimmed.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          const lastName = parts[0];
          const firstAndMiddle = parts.slice(1).join(" ");
          return `${firstAndMiddle} ${lastName}`.trim();
        }
        return trimmed;
      })
      .join("\n");
    setOutputText(converted);
  };

  // Convert "FirstName MiddleName LastName" to "LastName, FirstName MiddleName"
  const convertFirstLastToLastFirst = () => {
    setActiveMode("first-last");
    const lines = inputText.split("\n");
    const converted = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        // If already has comma, leave or split properly
        if (trimmed.includes(",")) return trimmed;
        const words = trimmed.split(/\s+/);
        if (words.length >= 2) {
          const lastName = words.pop();
          const firstAndMiddle = words.join(" ");
          return `${lastName}, ${firstAndMiddle}`;
        }
        return trimmed;
      })
      .join("\n");
    setOutputText(converted);
  };

  // AI "Suggest conversion for the text"
  const handleSuggestConversion = async () => {
    if (!inputText.trim()) return;
    setActiveMode("ai-suggest");
    setLoadingAi(true);
    setAiSuggestions(null);

    try {
      const res = await fetch("/api/gemini/suggest-text-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          customGoal: customGoal.trim() || undefined,
        }),
      });
      const data: TextConversionSuggestion = await res.json();
      setAiSuggestions(data);
      if (data.primarySuggestion?.transformedResult) {
        setOutputText(data.primarySuggestion.transformedResult);
      }
    } catch (err: any) {
      console.error("AI text conversion error:", err);
      // Fallback
      convertLastFirstToFirstLast();
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted_text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyOption = (previewText: string) => {
    setOutputText(previewText);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Name & Text Format Converter
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Instantly convert name formats, batch normalize lists, and leverage AI to suggest optimal text conversions.
        </p>
      </div>

      {/* Action Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            id="btn-convert-last-to-first"
            onClick={convertLastFirstToFirstLast}
            className={`px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === "last-first"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300"
            }`}
          >
            <span>LastName, First Middle</span>
            <span className="opacity-75">➔</span>
            <span>First Middle Last</span>
          </button>

          <button
            id="btn-convert-first-to-last"
            onClick={convertFirstLastToLastFirst}
            className={`px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === "first-last"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300"
            }`}
          >
            <span>First Middle Last</span>
            <span className="opacity-75">➔</span>
            <span>LastName, First Middle</span>
          </button>
        </div>

        <button
          id="btn-suggest-conversion"
          onClick={handleSuggestConversion}
          disabled={loadingAi}
          className="px-4 py-2.5 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 disabled:opacity-60 transition-all active:scale-98"
        >
          {loadingAi ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Text...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              <span>Suggest Conversion (AI)</span>
            </>
          )}
        </button>
      </div>

      {/* AI Suggestions Box (if triggered) */}
      {aiSuggestions && (
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Detected Format: {aiSuggestions.detectedFormat}</span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">
              {aiSuggestions.primarySuggestion.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              Alternative Conversions:
            </span>
            {aiSuggestions.alternativeOptions?.map((opt) => (
              <button
                key={opt.id}
                onClick={() => applyOption(opt.preview)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs border border-amber-200 dark:border-neutral-700 transition-colors"
                title={opt.description}
              >
                {opt.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dual Column Editor & Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Column */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span>Input Raw Text / Names (Line by line)</span>
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">
              {inputText.split("\n").filter((l) => l.trim()).length} records
            </span>
          </div>

          <textarea
            id="text-converter-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            placeholder="Paste your names or raw text here (one per line)..."
            className="w-full flex-1 p-3 text-base sm:text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setInputText(sampleNames)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sample Names</span>
            </button>
            <button
              onClick={() => setInputText("")}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Converted Output</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-copy-converted"
                onClick={handleCopy}
                disabled={!outputText}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>

              <button
                id="btn-download-converted"
                onClick={handleDownload}
                disabled={!outputText}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>

          <textarea
            id="text-converter-output"
            readOnly
            value={outputText || (inputText ? "Click any conversion button above to generate output." : "")}
            rows={10}
            className="w-full flex-1 p-3 text-base sm:text-xs font-mono rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none resize-none leading-relaxed"
          />

          <div className="text-[11px] text-neutral-400 pt-1">
            Output is ready for spreadsheets, database records, and CSV exports.
          </div>
        </div>
      </div>
    </div>
  );
}
