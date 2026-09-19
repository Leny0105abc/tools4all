import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";
import CloudStorageSuite from "./components/dashboard/CloudStorageSuite";
import YouTubeConverter from "./components/tools/YouTubeConverter";
import Mp4ToMp3Converter from "./components/tools/Mp4ToMp3Converter";
import NameAndTextConverter from "./components/tools/NameAndTextConverter";
import ExcelPasswordUnlocker from "./components/tools/ExcelPasswordUnlocker";
import DocumentConverter from "./components/tools/DocumentConverter";
import ImageCompressorTool from "./components/tools/ImageCompressorTool";
import FileSplitMergeTool from "./components/tools/FileSplitMergeTool";
import CollageCreatorTool from "./components/tools/CollageCreatorTool";
import OcrPaperworkTool from "./components/tools/OcrPaperworkTool";
import { ToolId } from "./types";
import { ShieldCheck, Sparkles, Smartphone, Layers } from "lucide-react";

export default function App() {
  const [currentTool, setCurrentTool] = useState<ToolId>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("omni_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("omni_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("omni_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const renderActiveTool = () => {
    switch (currentTool) {
      case "dashboard":
        return <Dashboard onSelectTool={setCurrentTool} />;
      case "youtube-converter":
        return <YouTubeConverter />;
      case "mp4-to-mp3":
        return <Mp4ToMp3Converter />;
      case "name-text-converter":
        return <NameAndTextConverter />;
      case "excel-unlocker":
        return <ExcelPasswordUnlocker />;
      case "document-converter":
        return <DocumentConverter />;
      case "image-compressor":
        return <ImageCompressorTool />;
      case "file-split-merge":
        return <FileSplitMergeTool />;
      case "collage-creator":
        return <CollageCreatorTool />;
      case "ocr-paperwork":
        return <OcrPaperworkTool />;
      case "cloud-storage":
        return <CloudStorageSuite onNavigateToTool={setCurrentTool} />;
      default:
        return <Dashboard onSelectTool={setCurrentTool} />;
    }
  };

  const mobileQuickTools: { id: ToolId; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: Layers },
    { id: "youtube-converter", label: "YouTube", icon: Smartphone },
    { id: "ocr-paperwork", label: "OCR Scan", icon: Sparkles },
    { id: "excel-unlocker", label: "Excel Unlock", icon: ShieldCheck },
  ];

  const allToolPills: { id: ToolId; label: string }[] = [
    { id: "dashboard", label: "Overview" },
    { id: "youtube-converter", label: "YouTube DL" },
    { id: "mp4-to-mp3", label: "MP4 to MP3" },
    { id: "name-text-converter", label: "Name & Text" },
    { id: "excel-unlocker", label: "Excel Unlock" },
    { id: "document-converter", label: "PDF & Docs" },
    { id: "image-compressor", label: "Compress" },
    { id: "file-split-merge", label: "Split/Merge" },
    { id: "collage-creator", label: "Collage" },
    { id: "ocr-paperwork", label: "OCR Scan" },
    { id: "cloud-storage", label: "Cloud Vault" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* Mobile Horizontal Quick-Scroll Tool Bar */}
      <div className="md:hidden sticky top-16 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 shadow-xs">
        {allToolPills.map((pill) => (
          <button
            key={pill.id}
            onClick={() => setCurrentTool(pill.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              currentTool === pill.id
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 active:bg-neutral-200"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex w-full">
        {/* Persistent Collapsible Sidebar */}
        <Sidebar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Viewport */}
        <main
          id="main-app-viewport"
          className="flex-1 md:pl-72 flex flex-col min-w-0 transition-all duration-200 pb-20 md:pb-6"
        >
          <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActiveTool()}
          </div>

          {/* Footer with Enterprise & Mobile Status Badges */}
          <footer className="hidden sm:block border-t border-neutral-200 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/50 py-4 px-6 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  OmniConverter & File Suite
                </span>
                <span>•</span>
                <span>Batch Processing & Document Security</span>
              </div>

              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero-Trust Local Privacy</span>
                </span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile Ready</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Gemini Multimodal Vision</span>
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2 py-1.5 safe-bottom shadow-lg"
      >
        <button
          onClick={() => setCurrentTool("dashboard")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-colors ${
            currentTool === "dashboard"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentTool("youtube-converter")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-colors ${
            currentTool === "youtube-converter" || currentTool === "mp4-to-mp3"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Smartphone className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Media</span>
        </button>

        <button
          onClick={() => setCurrentTool("ocr-paperwork")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-colors ${
            currentTool === "ocr-paperwork"
              ? "text-teal-600 dark:text-teal-400 font-semibold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">OCR Scan</span>
        </button>

        <button
          onClick={() => setCurrentTool("excel-unlocker")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-colors ${
            currentTool === "excel-unlocker"
              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Excel</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          <div className="w-5 h-5 flex flex-col justify-center items-center gap-0.5 mb-0.5">
            <span className="w-3.5 h-0.5 bg-current rounded-full" />
            <span className="w-3.5 h-0.5 bg-current rounded-full" />
            <span className="w-3.5 h-0.5 bg-current rounded-full" />
          </div>
          <span className="text-[10px] leading-tight">More</span>
        </button>
      </nav>
    </div>
  );
}
