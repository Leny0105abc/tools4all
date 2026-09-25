import {
  Youtube,
  Music,
  Mic,
  ArrowLeftRight,
  FileSpreadsheet,
  FileText,
  Minimize2,
  GitFork,
  LayoutGrid,
  ScanText,
  FolderLock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Upload,
  Video,
} from "lucide-react";
import { ToolTabId } from "../../types";

interface DashboardProps {
  onSelectTool: (id: ToolTabId) => void;
}

export default function Dashboard({ onSelectTool }: DashboardProps) {
  const toolCards: {
    id: ToolTabId;
    title: string;
    description: string;
    icon: any;
    badge: string;
    color: string;
    actionLabel: string;
  }[] = [
    {
      id: "youtube-converter",
      title: "YouTube Video Download",
      description: "Save a playable MP4 stream with video and audio directly to your device.",
      icon: Youtube,
      badge: "Media Stream",
      color: "from-red-500/10 to-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50",
      actionLabel: "Open Converter",
    },
    {
      id: "mp4-to-mp3",
      title: "Convert MP4 to MP3",
      description: "Extract studio-grade 320kbps MP3 audio from MP4, MOV, and WebM video recordings with tag editor.",
      icon: Music,
      badge: "Audio Extractor",
      color: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50",
      actionLabel: "Extract Audio",
    },
    {
      id: "video-compressor",
      title: "Video Compression Studio",
      description: "Reduce video size locally with mobile-friendly quality presets, resolution controls, preview, and download.",
      icon: Video,
      badge: "Local Compressor",
      color: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50",
      actionLabel: "Compress Video",
    },
    {
      id: "audio-notes",
      title: "Audio Notes",
      description: "Record voice notes, review them, and keep or download real MP3 files on this device.",
      icon: Mic,
      badge: "Voice Recorder",
      color: "from-violet-500/10 to-indigo-500/5 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50",
      actionLabel: "Quick Record",
    },
    {
      id: "name-text-converter",
      title: "Name & AI Text Converter",
      description: "Swap LastName, First Middle to First Middle Last and vice-versa, with AI-suggested text transformations.",
      icon: ArrowLeftRight,
      badge: "Smart Text",
      color: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50",
      actionLabel: "Convert Names",
    },
    {
      id: "excel-unlocker",
      title: "Excel Password Remover",
      description: "Upload password-locked or edit-restricted Excel sheets (.xlsx) to strip protection and view data freely.",
      icon: FileSpreadsheet,
      badge: "Decryption",
      color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
      actionLabel: "Unlock Sheet",
    },
    {
      id: "document-converter",
      title: "PDF to Word & Doc Suite",
      description: "Convert PDF documents into editable Microsoft Word (.docx) or compile rich text into formatted PDFs.",
      icon: FileText,
      badge: "Documents",
      color: "from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
      actionLabel: "Convert Docs",
    },
    {
      id: "image-compressor",
      title: "Image Compression Utilities",
      description: "Compress JPG, PNG, and WebP assets with quality sliders, dimension resizing, and ZIP batch export.",
      icon: Minimize2,
      badge: "Batch Optimizer",
      color: "from-pink-500/10 to-pink-500/5 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/50",
      actionLabel: "Compress Images",
    },
    {
      id: "file-split-merge",
      title: "File Splitting & Merging",
      description: "Combine multiple PDFs or text records into one file, or split multi-page paperwork by page numbers.",
      icon: GitFork,
      badge: "PDF Utilities",
      color: "from-purple-500/10 to-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50",
      actionLabel: "Split / Merge",
    },
    {
      id: "collage-creator",
      title: "Images to Collage Studio",
      description: "Arrange photos into modern grid collages, customize border radius, canvas background, and export high-res.",
      icon: LayoutGrid,
      badge: "Creative Studio",
      color: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
      actionLabel: "Create Collage",
    },
    {
      id: "ocr-paperwork",
      title: "OCR Paperwork & Mobile Editor",
      description: "Extract text and tables from invoices, receipts, and paperwork using Gemini Vision with instant editor.",
      icon: ScanText,
      badge: "AI Vision",
      color: "from-teal-500/10 to-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
      actionLabel: "Scan Paperwork",
    },
    {
      id: "cloud-storage",
      title: "Secure Cloud Storage & RBAC",
      description: "Cloud repository with granular user permissions, AES-256 encryption tags, and batch file workflows.",
      icon: FolderLock,
      badge: "Enterprise",
      color: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50",
      actionLabel: "Open Cloud Vault",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Overview */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-neutral-900 to-black text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-sm border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unified File Management Dashboard</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            All-in-One File Conversion & Document Security Suite
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Convert YouTube media, compress video, extract MP3 audio, unlock passworded Excel sheets, reformat names, compress images, split/merge PDFs, and scan paperwork via AI OCR on desktop and mobile.
          </p>

          {/* Metric quick stats */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10">
              <div className="text-base sm:text-lg font-black text-indigo-400">100%</div>
              <div className="text-[11px] text-neutral-400">Local & Client-Side Privacy</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10">
              <div className="text-base sm:text-lg font-black text-emerald-400">12 Tools</div>
              <div className="text-[11px] text-neutral-400">Multi-Format Suite</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/10">
              <div className="text-base sm:text-lg font-black text-teal-400">Gemini AI</div>
              <div className="text-[11px] text-neutral-400">Vision OCR & Text Engine</div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid of Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Available File Management & Conversion Utilities
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Select a tool to begin processing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTool(tool.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectTool(tool.id);
                  }
                }}
                className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tool.color} border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <span>{tool.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
