import {
  Layers,
  Youtube,
  Music,
  FileSpreadsheet,
  FileText,
  Minimize2,
  GitFork,
  Image as ImageIcon,
  ScanText,
  HardDrive,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { ToolId } from "../types";

interface SidebarProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentTool,
  onSelectTool,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const groups = [
    {
      title: "BATCH & WORKSPACE",
      items: [
        {
          id: "dashboard" as ToolId,
          label: "Batch Processing Queue",
          icon: Layers,
          badge: "Unified",
        },
        {
          id: "cloud-storage" as ToolId,
          label: "Secure Cloud Storage",
          icon: HardDrive,
          badge: "Permissions",
        },
      ],
    },
    {
      title: "MEDIA & VIDEO CONVERTERS",
      items: [
        {
          id: "youtube-converter" as ToolId,
          label: "YouTube to MP4 / MP3",
          icon: Youtube,
          badge: "Local Save",
        },
        {
          id: "mp4-to-mp3" as ToolId,
          label: "Convert MP4 to MP3",
          icon: Music,
          badge: "Lossless",
        },
      ],
    },
    {
      title: "TEXT & SPREADSHEETS",
      items: [
        {
          id: "name-text-converter" as ToolId,
          label: "Name & AI Text Converter",
          icon: ArrowLeftRight,
          badge: "Smart",
        },
        {
          id: "excel-unlocker" as ToolId,
          label: "Excel Password Unlocker",
          icon: FileSpreadsheet,
          badge: "Instant",
        },
      ],
    },
    {
      title: "DOCUMENT & PDF SUITE",
      items: [
        {
          id: "document-converter" as ToolId,
          label: "PDF to Word & Document",
          icon: FileText,
          badge: "DOCX",
        },
        {
          id: "file-split-merge" as ToolId,
          label: "File Split & Merge",
          icon: GitFork,
          badge: "Reorder",
        },
      ],
    },
    {
      title: "IMAGE TOOLS & OCR",
      items: [
        {
          id: "image-compressor" as ToolId,
          label: "Image Compression",
          icon: Minimize2,
          badge: "Up to -80%",
        },
        {
          id: "collage-creator" as ToolId,
          label: "Images to Collage",
          icon: ImageIcon,
          badge: "Layouts",
        },
        {
          id: "ocr-paperwork" as ToolId,
          label: "Paperwork OCR & Editor",
          icon: ScanText,
          badge: "Mobile Ready",
        },
      ],
    },
  ];

  const handleSelect = (id: ToolId) => {
    onSelectTool(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 md:top-16 bottom-0 left-0 z-50 md:z-40 w-72 max-w-[85vw] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 shadow-2xl md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile-only header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-neutral-900 dark:text-white">All Tools Menu</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h3 className="px-3 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="mt-1.5 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTool === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-item-${item.id}`}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-white active:bg-neutral-200 dark:active:bg-neutral-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        />
                        <span className="truncate text-[13px] sm:text-xs">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-normal shrink-0 ${
                            isActive
                              ? "bg-white/20 text-white font-medium"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-neutral-600 dark:text-neutral-300">
            <div className="flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300 mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Client-Side Speed</span>
            </div>
            <span>Fast, secure conversions directly in your browser with offline capability.</span>
          </div>
        </div>
      </aside>
    </>
  );
}
