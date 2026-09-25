import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Search,
  HardDrive,
  Menu,
  X,
  Layers,
  Sparkles,
  Command,
  LogOut,
} from "lucide-react";
import { ToolId } from "../types";

interface NavbarProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export default function Navbar({
  currentTool,
  onSelectTool,
  isDark,
  onToggleTheme,
  mobileMenuOpen,
  onToggleMobileMenu,
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const toolIndex: { id: ToolId; title: string; category: string }[] = [
    { id: "youtube-converter", title: "YouTube Video Download", category: "Media" },
    { id: "mp4-to-mp3", title: "MP4 to MP3 Extractor", category: "Media" },
    { id: "name-text-converter", title: "Name & Text Format Converter", category: "Text" },
    { id: "excel-unlocker", title: "Excel Password Unlocker", category: "Spreadsheet" },
    { id: "document-converter", title: "PDF to Word / Document Tools", category: "Documents" },
    { id: "file-split-merge", title: "File Split & Merge", category: "Documents" },
    { id: "image-compressor", title: "Image Compression Utilities", category: "Images" },
    { id: "collage-creator", title: "Images to Collage Maker", category: "Images" },
    { id: "ocr-paperwork", title: "Scanned Paperwork OCR", category: "OCR" },
    { id: "dashboard", title: "Batch Processing Queue", category: "Batch" },
    { id: "cloud-storage", title: "Secure Cloud Storage", category: "Storage" },
  ];

  const filteredTools = searchQuery.trim()
    ? toolIndex.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-toggle-btn"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            id="app-brand-logo"
            onClick={() => onSelectTool("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-neutral-900 dark:text-white text-base">
                  OmniConverter
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  SUITE PRO
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 -mt-0.5 hidden sm:block">
                Unified File & Media Hub
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Search Trigger */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-6">
          <button
            id="quick-search-trigger-btn"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span>Search tools (YouTube, Excel, OCR, PDF...)</span>
            </span>
            <kbd className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Search (mobile), Storage Quota, Theme Toggle, Action */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile Search Icon Button */}
          <button
            id="mobile-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search tools"
            className="lg:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Storage Quota widget */}
          <div
            id="storage-quota-indicator"
            onClick={() => onSelectTool("cloud-storage")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            title="Cloud Storage Quota"
          >
            <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div className="text-[11px] leading-none">
              <div className="text-neutral-700 dark:text-neutral-300 font-medium">
                4.2 GB <span className="text-neutral-400 font-normal">/ 15 GB</span>
              </div>
              <div className="w-16 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                <div className="w-[28%] h-full bg-indigo-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Batch Processing CTA */}
          <button
            id="header-batch-queue-btn"
            onClick={() => onSelectTool("dashboard")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm shadow-indigo-500/25 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-neutral-200 dark:border-neutral-700/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modal Quick Search Dialog */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <Search className="w-4 h-4 text-neutral-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Type a tool name or format (e.g. YouTube, OCR, Excel, MP3)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {(searchQuery.trim() ? filteredTools : toolIndex).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool.id);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    currentTool === tool.id
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <span className="font-medium">{tool.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    {tool.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
