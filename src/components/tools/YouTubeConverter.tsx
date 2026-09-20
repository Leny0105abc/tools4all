import { useState } from "react";
import {
  Youtube,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
  Music,
  ExternalLink,
  Sparkles,
  Film,
} from "lucide-react";

interface VideoFormat {
  id: string;
  itag: number;
  format: string;
  quality: string;
  type: "video" | "audio";
  size: string;
  ext: string;
}

export default function YouTubeConverter() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{
    videoId: string;
    title: string;
    author: string;
    thumbnail: string;
    duration: string;
    formats: VideoFormat[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "video" | "audio">("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const sampleLinks = [
    { label: "Tutorial Sample", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { label: "Podcast Clip", url: "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
  ];

  const handleFetchInfo = async (targetUrl = url) => {
    if (!targetUrl.trim()) {
      setError("Please paste a valid YouTube video or shorts URL.");
      return;
    }
    setError(null);
    setLoading(true);
    setDownloadSuccess(null);

    try {
      const res = await fetch("/api/youtube/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (!res.ok) {
        throw new Error("Could not fetch video information. Check link format.");
      }
      const data = await res.json();
      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve video stream info.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: VideoFormat) => {
    if (!videoInfo) return;
    setDownloadingId(format.id);
    setDownloadProgress(5);
    setDownloadSuccess(null);
    setError(null);

    try {
      const params = new URLSearchParams({
        videoId: videoInfo.videoId,
        itag: String(format.itag),
        title: videoInfo.title,
      });
      const response = await fetch(`/api/youtube/download?${params}`);
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Could not download this media stream.");
      }

      const total = Number(response.headers.get("content-length")) || 0;
      const reader = response.body.getReader();
      const chunks: ArrayBuffer[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value.slice().buffer as ArrayBuffer);
        received += value.length;
        setDownloadProgress(total ? Math.min(95, Math.round((received / total) * 100)) : 50);
      }

      const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${videoInfo.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.${format.ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setDownloadProgress(100);
      setDownloadSuccess(`Saved ${format.format} (${format.quality}) to your device.`);
    } catch (err: any) {
      setError(err.message || "Failed to download the media file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFormats = videoInfo?.formats.filter((f) => {
    if (activeTab === "video") return f.type === "video";
    if (activeTab === "audio") return f.type === "audio";
    return true;
  });
  const hasAudioFormats = videoInfo?.formats.some((format) => format.type === "audio");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Youtube className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              YouTube Video Downloader
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Save a playable MP4 stream with video and audio for offline use where permitted.
          </p>
        </div>
      </div>

      {/* Input Box */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          YouTube Video or Shorts URL
        </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="youtube-url-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
                className="w-full px-4 py-3 text-base sm:text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              id="youtube-fetch-btn"
              onClick={() => handleFetchInfo()}
              disabled={loading}
              className="min-h-[44px] px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-60 transition-all shrink-0 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Fetch Formats</span>
                </>
              )}
            </button>
          </div>

          {/* Quick sample chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-neutral-400 text-[11px] w-full sm:w-auto">Quick Test Samples:</span>
            {sampleLinks.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setUrl(sample.url);
                  handleFetchInfo(sample.url);
                }}
                className="px-2.5 py-1.5 min-h-[32px] rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 text-neutral-700 dark:text-neutral-300 text-[11px] transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* Video Preview & Format Selection */}
      {videoInfo && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
          {/* Metadata Card */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-xs">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                {videoInfo.duration}
              </span>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white leading-snug line-clamp-2">
                {videoInfo.title}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Channel: <span className="text-neutral-800 dark:text-neutral-200 font-medium">{videoInfo.author}</span>
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
                <Film className="w-3.5 h-3.5" />
                <span>Ready for local offline export</span>
              </div>
            </div>
          </div>

          {/* Format Filter Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                All Formats
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === "video"
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video (MP4)</span>
              </button>
              {hasAudioFormats && (
                <button
                  onClick={() => setActiveTab("audio")}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === "audio"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-neutral-400 hidden md:inline shrink-0 pl-2">
              {filteredFormats?.length || 0} options available
            </span>
          </div>

          {/* Formats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFormats?.map((fmt) => {
              const isCurrent = downloadingId === fmt.id;
              return (
                <div
                  key={fmt.id}
                  className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        fmt.type === "video"
                          ? "bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {fmt.type === "video" ? <Video className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {fmt.format}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          • {fmt.quality}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Source: {fmt.size}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`download-${fmt.id}-btn`}
                    onClick={() => handleDownload(fmt)}
                    disabled={isCurrent || downloadingId !== null}
                    className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isCurrent ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{downloadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Save to Local</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
