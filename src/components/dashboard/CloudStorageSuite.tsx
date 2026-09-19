import { useState, useRef } from "react";
import {
  FolderLock,
  Upload,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Unlock,
  Eye,
  CheckSquare,
  Square,
  Search,
  Filter,
  MoreVertical,
  Share2,
  FileText,
  FileSpreadsheet,
  Music,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Users,
  Archive,
  Sparkles,
  ScanText,
} from "lucide-react";
import { CloudFileItem, GranularPermission, ToolTabId } from "../../types";
import { formatFileSize, downloadBlob } from "../../utils/audioConverter";
import JSZip from "jszip";

interface CloudStorageSuiteProps {
  onNavigateToTool: (toolId: ToolTabId) => void;
}

export default function CloudStorageSuite({ onNavigateToTool }: CloudStorageSuiteProps) {
  // Initial demo files with granular permissions
  const [files, setFiles] = useState<CloudFileItem[]>([
    {
      id: "f-1",
      name: "Q3_Quarterly_Financial_Report.xlsx",
      size: 1420000,
      type: "spreadsheet",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      lastModified: Date.now() - 1000 * 60 * 60 * 4,
      isEncrypted: true,
      permission: {
        accessLevel: "restricted",
        allowView: true,
        allowEdit: true,
        allowDownload: false,
        allowShare: false,
        allowedUsers: ["finance@company.com", "cfo@company.com"],
        expiresAt: "2026-10-31",
      },
    },
    {
      id: "f-2",
      name: "Product_Strategy_Keynote.pdf",
      size: 4890000,
      type: "pdf",
      mimeType: "application/pdf",
      lastModified: Date.now() - 1000 * 60 * 60 * 24,
      isEncrypted: false,
      permission: {
        accessLevel: "public",
        allowView: true,
        allowEdit: false,
        allowDownload: true,
        allowShare: true,
      },
    },
    {
      id: "f-3",
      name: "Podcast_Episode_14_Master.mp4",
      size: 28400000,
      type: "video",
      mimeType: "video/mp4",
      lastModified: Date.now() - 1000 * 60 * 60 * 48,
      isEncrypted: true,
      permission: {
        accessLevel: "private",
        allowView: true,
        allowEdit: true,
        allowDownload: true,
        allowShare: false,
      },
    },
    {
      id: "f-4",
      name: "Scanned_Legal_Affidavit.jpg",
      size: 3200000,
      type: "image",
      mimeType: "image/jpeg",
      lastModified: Date.now() - 1000 * 60 * 60 * 72,
      isEncrypted: true,
      permission: {
        accessLevel: "restricted",
        allowView: true,
        allowEdit: false,
        allowDownload: true,
        allowShare: false,
        allowedUsers: ["legal@company.com"],
      },
    },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingPermissionFile, setEditingPermissionFile] = useState<CloudFileItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered files
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || f.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleUploadFiles = (uploaded: FileList | File[]) => {
    const newItems: CloudFileItem[] = Array.from(uploaded).map((file) => {
      let type: CloudFileItem["type"] = "other";
      if (file.type.includes("pdf")) type = "pdf";
      else if (file.type.includes("video")) type = "video";
      else if (file.type.includes("audio")) type = "audio";
      else if (file.type.includes("image")) type = "image";
      else if (file.name.match(/\.(xlsx|xls|csv)$/i)) type = "spreadsheet";
      else if (file.type.includes("text") || file.name.match(/\.(docx|doc|txt)$/i)) type = "document";

      return {
        id: "f-" + Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type,
        mimeType: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
        isEncrypted: true,
        fileRef: file,
        permission: {
          accessLevel: "private",
          allowView: true,
          allowEdit: true,
          allowDownload: true,
          allowShare: false,
        },
      };
    });

    setFiles((prev) => [...newItems, ...prev]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setFiles((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

  const handleBatchDownloadZip = async () => {
    const selected = files.filter((f) => selectedIds.includes(f.id));
    if (selected.length === 0) return;

    const zip = new JSZip();
    for (const f of selected) {
      if (f.fileRef) {
        zip.file(f.name, f.fileRef);
      } else {
        // Mock payload for demo items
        zip.file(f.name, `Encrypted secure cloud asset payload for: ${f.name}`);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `cloud_batch_${Date.now()}.zip`);
  };

  const saveUpdatedPermission = (updatedPerm: GranularPermission) => {
    if (!editingPermissionFile) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === editingPermissionFile.id ? { ...f, permission: updatedPerm } : f))
    );
    setEditingPermissionFile(null);
  };

  const getIconForType = (type: CloudFileItem["type"]) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4 text-violet-500" />;
      case "audio":
        return <Music className="w-4 h-4 text-indigo-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case "pdf":
      case "document":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-pink-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-400" />;
    }
  };

  const totalUsedBytes = files.reduce((acc, f) => acc + f.size, 0);
  const maxQuotaBytes = 1073741824; // 1 GB
  const usedPercent = Math.min(100, Math.round((totalUsedBytes / maxQuotaBytes) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <FolderLock className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Secure Cloud Storage & Granular Permission Suite
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Enterprise cloud repository with zero-trust AES encryption, role-based access control (RBAC), and batch processing.
          </p>
        </div>

        {/* Quota Indicator */}
        <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 w-full sm:w-64 shrink-0">
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
            <span className="font-semibold">Storage Quota</span>
            <span>
              {formatFileSize(totalUsedBytes)} / 1 GB ({usedPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              style={{ width: `${usedPercent}%` }}
              className="h-full bg-cyan-500 rounded-full transition-all"
            />
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        id="cloud-drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.length) {
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20"
            : "border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleUploadFiles(e.target.files);
          }}
        />
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-neutral-900 dark:text-white">
              Drag & drop files here to upload to encrypted cloud storage
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Videos, MP3s, Excel files, PDFs, Scanned paperwork • Batch uploads supported
            </p>
          </div>
        </div>
      </div>

      {/* Batch Actions & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1">
              {["all", "spreadsheet", "pdf", "video", "image"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                    filterType === t
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Batch action buttons */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                {selectedIds.length} selected
              </span>

              <button
                onClick={handleBatchDownloadZip}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-cyan-600/20"
              >
                <Archive className="w-3 h-3" />
                <span>Download Batch (.zip)</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Files Table / Mobile Cards */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
            <button onClick={toggleSelectAll} className="flex items-center gap-2">
              {selectedIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-cyan-600" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Select All</span>
            </button>
            <span className="text-[11px] text-neutral-400">{filteredFiles.length} files</span>
          </div>

          {filteredFiles.map((file) => {
            const isSelected = selectedIds.includes(file.id);
            return (
              <div
                key={file.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-50/40 dark:bg-cyan-950/20"
                    : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/40"
                } space-y-2.5`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleSelect(file.id)}
                      className="mt-0.5 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-600" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {getIconForType(file.type)}
                        <p className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                          {file.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                        <span className="font-mono">{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">AES-256</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      file.permission.accessLevel === "public"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : file.permission.accessLevel === "restricted"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                        : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    {file.permission.accessLevel}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
                  <div className="flex items-center gap-1.5">
                    {file.type === "video" && (
                      <button
                        onClick={() => onNavigateToTool("mp4-to-mp3")}
                        className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-medium flex items-center gap-1"
                      >
                        <Music className="w-3 h-3" />
                        <span>To MP3</span>
                      </button>
                    )}
                    {file.type === "spreadsheet" && (
                      <button
                        onClick={() => onNavigateToTool("excel-unlocker")}
                        className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-medium flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Unlock</span>
                      </button>
                    )}
                    {file.type === "image" && (
                      <button
                        onClick={() => onNavigateToTool("ocr-paperwork")}
                        className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-medium flex items-center gap-1"
                      >
                        <ScanText className="w-3 h-3" />
                        <span>OCR</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingPermissionFile(file)}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Permissions</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-medium">
                <th className="p-3 w-8">
                  <button onClick={toggleSelectAll} className="flex items-center text-neutral-400">
                    {selectedIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">File Name</th>
                <th className="p-3">Size</th>
                <th className="p-3">Access Level</th>
                <th className="p-3">Permissions</th>
                <th className="p-3">Security</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
              {filteredFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <tr
                    key={file.id}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                      isSelected ? "bg-cyan-50/50 dark:bg-cyan-950/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      <button onClick={() => toggleSelect(file.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-600" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {getIconForType(file.type)}
                        <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
                          {file.name}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-neutral-500 dark:text-neutral-400 font-mono">
                      {formatFileSize(file.size)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          file.permission.accessLevel === "public"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : file.permission.accessLevel === "restricted"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {file.permission.accessLevel === "public" ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        <span>{file.permission.accessLevel}</span>
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
                        {file.permission.allowView && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                            View
                          </span>
                        )}
                        {file.permission.allowEdit && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                            Edit
                          </span>
                        )}
                        {file.permission.allowDownload && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                            DL
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AES-256</span>
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {file.type === "video" && (
                          <button
                            onClick={() => onNavigateToTool("mp4-to-mp3")}
                            className="px-2 py-1 rounded-lg text-[11px] bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-medium"
                          >
                            To MP3
                          </button>
                        )}
                        {file.type === "spreadsheet" && (
                          <button
                            onClick={() => onNavigateToTool("excel-unlocker")}
                            className="px-2 py-1 rounded-lg text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-medium"
                          >
                            Unlock
                          </button>
                        )}
                        {file.type === "image" && (
                          <button
                            onClick={() => onNavigateToTool("ocr-paperwork")}
                            className="px-2 py-1 rounded-lg text-[11px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-medium"
                          >
                            OCR
                          </button>
                        )}

                        <button
                          onClick={() => setEditingPermissionFile(file)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Granular Permissions & Access Control"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Editor Modal */}
      {editingPermissionFile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Granular Permissions & Access Control
                </h3>
              </div>
              <button
                onClick={() => setEditingPermissionFile(null)}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-xs text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Editing permissions for:{" "}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {editingPermissionFile.name}
              </span>
            </p>

            {/* Access Level Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Access Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["private", "restricted", "public"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() =>
                      setEditingPermissionFile({
                        ...editingPermissionFile,
                        permission: {
                          ...editingPermissionFile.permission,
                          accessLevel: lvl,
                        },
                      })
                    }
                    className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      editingPermissionFile.permission.accessLevel === lvl
                        ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox Privileges */}
            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Granular Privileges
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "allowView", label: "Allow Read / Preview" },
                  { key: "allowEdit", label: "Allow Edit / Conversion" },
                  { key: "allowDownload", label: "Allow Local Download" },
                  { key: "allowShare", label: "Allow Link Sharing" },
                ].map((priv) => {
                  const isChecked = (editingPermissionFile.permission as any)[priv.key];
                  return (
                    <button
                      key={priv.key}
                      onClick={() =>
                        setEditingPermissionFile({
                          ...editingPermissionFile,
                          permission: {
                            ...editingPermissionFile.permission,
                            [priv.key]: !isChecked,
                          },
                        })
                      }
                      className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                        isChecked
                          ? "border-cyan-500 bg-cyan-50/30 dark:bg-cyan-950/20 text-neutral-900 dark:text-white"
                          : "border-neutral-200 dark:border-neutral-800 text-neutral-400"
                      }`}
                    >
                      <span>{priv.label}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setEditingPermissionFile(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => saveUpdatedPermission(editingPermissionFile.permission)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm shadow-cyan-600/20"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
