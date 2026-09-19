import { useState, useRef } from "react";
import {
  Music,
  Upload,
  Play,
  Pause,
  Download,
  Loader2,
  CheckCircle2,
  FileVideo,
  Volume2,
  Sparkles,
} from "lucide-react";
import { extractAudioFromVideo, downloadBlob, formatFileSize } from "../../utils/audioConverter";

export default function Mp4ToMp3Converter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioResult, setAudioResult] = useState<{
    blob: Blob;
    url: string;
    duration: number;
    filename: string;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bitrate, setBitrate] = useState<"320" | "192" | "128">("320");
  const [trackTitle, setTrackTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.includes("video") && !file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
      alert("Please upload a video file (.mp4, .mov, .webm, etc.)");
      return;
    }
    setSelectedFile(file);
    setAudioResult(null);
    setTrackTitle(file.name.replace(/\.[^/.]+$/, ""));
    setArtist("Audio Extraction");
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setConverting(true);
    setProgress(10);

    try {
      const res = await extractAudioFromVideo(selectedFile, {
        format: "mp3",
        bitrate,
        onProgress: (p) => setProgress(p),
      });

      const audioUrl = URL.createObjectURL(res.blob);
      setAudioResult({
        blob: res.blob,
        url: audioUrl,
        duration: res.duration,
        filename: trackTitle ? `${trackTitle}.mp3` : res.filename,
      });
    } catch (err: any) {
      alert("Failed to convert video to audio: " + err.message);
    } finally {
      setConverting(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioResult) return;
    const finalFilename = trackTitle ? `${trackTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp3` : audioResult.filename;
    downloadBlob(audioResult.blob, finalFilename);
  };

  const loadSampleVideo = () => {
    // Generate sample MP4 file dummy for instant testing
    const sampleBytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const file = new File([sampleBytes], "Sample_Presentation_Recording.mp4", { type: "video/mp4" });
    handleFileChange(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <Music className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Convert MP4 to MP3 Audio
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Extract pristine audio tracks from MP4, MOV, and WebM videos with custom bitrate and tag options.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        id="mp4-drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) {
            handleFileChange(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
            : "border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.mkv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {selectedFile ? selectedFile.name : "Tap to choose video or drag & drop"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Supports MP4, MOV, WebM, MKV (Up to 500 MB)
            </p>
          </div>
          {selectedFile && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-xs font-medium">
              <FileVideo className="w-3.5 h-3.5" />
              <span>{formatFileSize(selectedFile.size)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Options Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Audio Bitrate
            </label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value as any)}
              className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="320">320 kbps (High Fidelity Studio)</option>
              <option value="192">192 kbps (Standard Quality)</option>
              <option value="128">128 kbps (Voice / Podcast)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Track Title
            </label>
            <input
              type="text"
              placeholder="e.g. Episode 01 Recording"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Artist / Author
            </label>
            <input
              type="text"
              placeholder="e.g. Master Audio"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            onClick={loadSampleVideo}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center sm:justify-start gap-1 font-medium min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Video File</span>
          </button>

          <button
            id="convert-mp4-to-mp3-btn"
            onClick={handleConvert}
            disabled={!selectedFile || converting}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-98"
          >
            {converting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Audio ({progress}%)...</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                <span>Extract & Convert to MP3</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Player & Download */}
      {audioResult && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Audio Extracted Successfully
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {audioResult.filename} • {formatFileSize(audioResult.blob.size)}
                </p>
              </div>
            </div>

            <button
              id="save-mp3-local-btn"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save MP3 to Local</span>
            </button>
          </div>

          {/* Mini audio player */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center gap-4">
            <audio
              ref={audioRef}
              src={audioResult.url}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              onClick={togglePlayback}
              className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Simulated waveform bars */}
            <div className="flex-1 flex items-center gap-1 h-8">
              {[40, 70, 25, 90, 60, 80, 45, 100, 75, 50, 85, 30, 95, 65, 40, 80, 55, 90, 35, 70, 45, 60, 30, 85].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-full transition-all ${
                      isPlaying ? "bg-indigo-500 dark:bg-indigo-400 animate-pulse" : "bg-neutral-300 dark:bg-neutral-600"
                    }`}
                  />
                )
              )}
            </div>

            <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 shrink-0 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{Math.round(audioResult.duration)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
