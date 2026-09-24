import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Mic, Pause, Play, RotateCcw, Save, Search, Square, Trash2, Pencil, X, AlertCircle, Sparkles } from "lucide-react";
import { downloadBlob, formatFileSize } from "../../utils/audioConverter";
import { convertRecordingToMp3, safeAudioNoteFilename } from "../../utils/audioNotesMp3";
import {
  AudioNote,
  AudioNoteDraft,
  deleteAudioNote,
  deleteAudioNoteDraft,
  getAudioNoteDraft,
  listAudioNotes,
  saveAudioNote,
  saveAudioNoteDraft,
} from "../../utils/audioNotesStorage";

type RecorderStatus = "ready" | "recording" | "paused" | "processing" | "ready-to-save" | "saved";
type NoteSort = "newest" | "oldest" | "title" | "longest" | "shortest";
const MAX_SUMMARY_AUDIO_BYTES = 45 * 1024 * 1024;

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60]
    .map((number) => String(number).padStart(2, "0"))
    .join(":");
}

function friendlyMicrophoneError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "Microphone access was blocked. Allow access in your browser's site settings, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No microphone was found. Connect one and try again.";
  if (name === "NotReadableError" || name === "TrackStartError") return "Your microphone is unavailable. Close other apps using it and try again.";
  return "The microphone could not start. Please check your device and try again.";
}

function noteDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

const fieldClass = "w-full min-h-11 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-base focus-visible:outline-2 focus-visible:outline-indigo-500";
const secondaryButton = "min-h-11 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-indigo-500 inline-flex items-center justify-center gap-2";

interface NoteFormValues {
  title: string;
  description: string;
  category: string;
  tags: string;
}

function NoteFields({ values, onChange, prefix }: { values: NoteFormValues; onChange: (values: NoteFormValues) => void; prefix: string }) {
  const set = (key: keyof NoteFormValues, value: string) => onChange({ ...values, [key]: value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-title`} className="block text-sm font-semibold mb-1.5">Note title</label>
        <input id={`${prefix}-title`} className={fieldClass} placeholder="e.g. TLE 8 Week 2 Lecture Notes" maxLength={120} value={values.title} onChange={(event) => set("title", event.target.value)} />
      </div>
      <div>
        <label htmlFor={`${prefix}-category`} className="block text-sm font-semibold mb-1.5">Category (optional)</label>
        <input id={`${prefix}-category`} className={fieldClass} placeholder="e.g. School" maxLength={60} value={values.category} onChange={(event) => set("category", event.target.value)} />
      </div>
      <div>
        <label htmlFor={`${prefix}-tags`} className="block text-sm font-semibold mb-1.5">Tags (optional)</label>
        <input id={`${prefix}-tags`} className={fieldClass} placeholder="Separate tags with commas" value={values.tags} onChange={(event) => set("tags", event.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-description`} className="block text-sm font-semibold mb-1.5">Description (optional)</label>
        <textarea id={`${prefix}-description`} className={`${fieldClass} min-h-20 resize-y`} placeholder="What is this note about?" maxLength={1000} value={values.description} onChange={(event) => set("description", event.target.value)} />
      </div>
    </div>
  );
}

export default function AudioNotesTool({ onActiveChange }: { onActiveChange: (active: boolean) => void }) {
  const [status, setStatus] = useState<RecorderStatus>("ready");
  const [durationMs, setDurationMs] = useState(0);
  const [draft, setDraft] = useState<AudioNoteDraft | null>(null);
  const [notes, setNotes] = useState<AudioNote[]>([]);
  const [fields, setFields] = useState<NoteFormValues>({ title: "", description: "", category: "", tags: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<NoteFormValues>({ title: "", description: "", category: "", tags: "" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<NoteSort>("newest");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryAvailable, setSummaryAvailable] = useState<boolean | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRef = useRef(false);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const recordedBytesRef = useRef(0);
  const lastStorageCheckRef = useRef(0);
  const draftRef = useRef<AudioNoteDraft | null>(null);
  const mountedRef = useRef(true);
  const microphoneRequestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    Promise.all([listAudioNotes(), getAudioNoteDraft()]).then(([saved, recovered]) => {
      if (!mountedRef.current) return;
      setNotes(saved);
      if (recovered) {
        draftRef.current = recovered;
        setDraft(recovered);
        setDurationMs(recovered.durationMs);
        setStatus("ready-to-save");
        setWarning(recovered.mp3Blob ? "An unsaved recording was restored." : "An unsaved recording was restored. Prepare its MP3 to save it.");
      }
    }).catch(() => setError("Local storage is unavailable. Check your browser settings before recording."));
    return () => { mountedRef.current = false; microphoneRequestRef.current++; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.json())
      .then((health: { hasGeminiKey?: boolean }) => {
        if (!cancelled && typeof health.hasGeminiKey === "boolean") setSummaryAvailable(health.hasGeminiKey);
      })
      .catch(() => { /* The summary request will report any connection error. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draft?.mp3Blob) { setDraftUrl(null); return; }
    const url = URL.createObjectURL(draft.mp3Blob);
    setDraftUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.mp3Blob]);

  useEffect(() => {
    const selected = notes.find((note) => note.id === playingId);
    if (!selected) { setPlayingUrl(null); return; }
    const url = URL.createObjectURL(selected.mp3Blob);
    setPlayingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [notes, playingId]);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => setDurationMs(elapsedRef.current + Date.now() - startedAtRef.current), 250);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "recording" && status !== "paused" && status !== "processing") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "Your recording has not been saved yet."; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const updateDraft = (value: AudioNoteDraft | null) => {
    draftRef.current = value;
    if (mountedRef.current) setDraft(value);
  };

  const prepareMp3 = async (currentDraft: AudioNoteDraft) => {
    if (!currentDraft.rawBlob) return;
    setStatus("processing");
    setProgress(0);
    setError("");
    try {
      const mp3Blob = await convertRecordingToMp3(currentDraft.rawBlob, setProgress);
      const prepared = { ...currentDraft, mp3Blob };
      updateDraft(prepared);
      try { await saveAudioNoteDraft(prepared); }
      catch { setWarning("MP3 is ready, but device storage is full. Download or save it before leaving this page."); }
      setStatus("ready-to-save");
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : "MP3 conversion failed. Your recording is still available as a draft.");
      setStatus("ready-to-save");
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onActiveChange(false);
  };

  const startRecording = async () => {
    if (draftRef.current) { setError("Save or discard your current draft before starting another recording."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording needs a supported browser on a secure HTTPS page.");
      return;
    }
    setBusy(true);
    const requestId = ++microphoneRequestRef.current;
    setError("");
    setWarning("");
    try {
      try {
        const estimate = await navigator.storage?.estimate?.();
        if (estimate?.quota != null && estimate.usage != null && estimate.quota - estimate.usage < 25 * 1024 * 1024) {
          setWarning("This device is low on storage. Long recordings may not save; free up space first.");
        }
      } catch { /* Some browsers do not expose storage estimates. Recording can still proceed. */ }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (requestId !== microphoneRequestRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = typeof MediaRecorder.isTypeSupported === "function"
        ? ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type))
        : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordedBytesRef.current = 0;
      lastStorageCheckRef.current = Date.now();
      cancelRef.current = false;
      elapsedRef.current = 0;
      startedAtRef.current = Date.now();
      setDurationMs(0);
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        recordedBytesRef.current += event.data.size;
        if (Date.now() - lastStorageCheckRef.current > 30_000) {
          lastStorageCheckRef.current = Date.now();
          navigator.storage?.estimate?.().then((estimate) => {
            if (estimate.quota != null && estimate.usage != null && estimate.quota - estimate.usage < Math.max(25 * 1024 * 1024, recordedBytesRef.current * 2)) {
              setWarning("Device storage is getting low. Stop and save this note soon, or free up space.");
            }
          }).catch(() => {});
        }
      };
      recorder.onerror = () => setError("Recording was interrupted. Stop to recover what was captured.");
      recorder.onstop = async () => {
        const finalDuration = elapsedRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0);
        startedAtRef.current = 0;
        stopStream();
        if (cancelRef.current) { chunksRef.current = []; setStatus("ready"); setDurationMs(0); return; }
        setStatus("processing");
        setDurationMs(finalDuration);
        const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType || chunksRef.current[0]?.type || "audio/webm" });
        chunksRef.current = [];
        if (!rawBlob.size) { setError("Nothing was recorded. Please try again."); setStatus("ready"); return; }
        const recovered: AudioNoteDraft = { id: "current", createdAt: Date.now(), durationMs: finalDuration, rawBlob };
        updateDraft(recovered);
        try { await saveAudioNoteDraft(recovered); }
        catch { setWarning("The recording could not be backed up to device storage. Keep this page open until you save it."); }
        await prepareMp3(recovered);
      };
      stream.getAudioTracks().forEach((track) => { track.onended = () => { if (recorder.state !== "inactive") { setError("The microphone disconnected. Your recording is being recovered."); recorder.stop(); } }; });
      recorder.start(1000);
      setStatus("recording");
      onActiveChange(true);
    } catch (microphoneError) {
      if (requestId !== microphoneRequestRef.current) return;
      stopStream();
      setError(friendlyMicrophoneError(microphoneError));
      setStatus("ready");
    } finally { if (requestId === microphoneRequestRef.current) setBusy(false); }
  };

  const cancelMicrophoneRequest = () => {
    microphoneRequestRef.current++;
    setBusy(false);
    setWarning("Microphone request cancelled. You can try again when ready.");
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "recording") return;
    elapsedRef.current += Date.now() - startedAtRef.current;
    startedAtRef.current = 0;
    recorder.pause();
    setDurationMs(elapsedRef.current);
    setStatus("paused");
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "paused") return;
    startedAtRef.current = Date.now();
    recorder.resume();
    setStatus("recording");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setStatus("processing");
    recorder.stop();
  };

  const cancelRecording = () => {
    if (!window.confirm("Discard this recording?")) return;
    cancelRef.current = true;
    stopRecording();
  };

  const discardDraft = async () => {
    if (!window.confirm("Discard this unsaved audio note?")) return;
    try { await deleteAudioNoteDraft(); }
    catch { setError("The draft could not be removed from device storage."); return; }
    updateDraft(null);
    setFields({ title: "", description: "", category: "", tags: "" });
    setStatus("ready");
    setDurationMs(0);
    setError("");
    setWarning("");
  };

  const saveDraft = async () => {
    if (!draft?.mp3Blob) return;
    const title = fields.title.trim() || `Audio note ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(draft.createdAt)}`;
    const note: AudioNote = {
      id: crypto.randomUUID(), title, description: fields.description.trim(), category: fields.category.trim(),
      tags: fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean), createdAt: draft.createdAt,
      durationMs: draft.durationMs, size: draft.mp3Blob.size, mp3Blob: draft.mp3Blob,
    };
    setBusy(true);
    try {
      await saveAudioNote(note);
      setNotes((previous) => [note, ...previous]);
      updateDraft(null);
      setFields({ title: "", description: "", category: "", tags: "" });
      setStatus("saved");
      setWarning("");
      setError("");
      try { await deleteAudioNoteDraft(); }
      catch { setWarning("Your note was saved, but the old draft could not be cleared. It may reappear after refresh."); }
    } catch {
      setError("This note could not be saved. Check device storage, then try again. You can still download the MP3 now.");
    } finally { setBusy(false); }
  };

  const saveEdit = async (note: AudioNote) => {
    if (!editFields.title.trim()) { setError("Please enter a note title."); return; }
    const edited = { ...note, title: editFields.title.trim(), description: editFields.description.trim(), category: editFields.category.trim(), tags: editFields.tags.split(",").map((tag) => tag.trim()).filter(Boolean) };
    try {
      await saveAudioNote(edited);
      setNotes((previous) => previous.map((item) => item.id === note.id ? edited : item));
      setEditingId(null);
      setError("");
    } catch { setError("Changes could not be saved. Please try again."); }
  };

  const summarizeNote = async (note: AudioNote) => {
    if (summaryAvailable === false || summarizingId) return;
    if (note.mp3Blob.size > MAX_SUMMARY_AUDIO_BYTES) {
      setError("This recording is too large to summarize online (45 MB maximum). You can still play or download it.");
      return;
    }
    if (!window.confirm(`Send "${note.title}" to Google Gemini to create a written summary? The recording will leave this device for processing.`)) return;
    setSummarizingId(note.id);
    setError("");
    try {
      const response = await fetch("/api/gemini/audio-summary", {
        method: "POST",
        headers: { "Content-Type": "audio/mpeg" },
        body: note.mp3Blob,
      });
      const result: { summary?: unknown; error?: string } = await response.json().catch(() => ({}));
      if (response.status === 413) throw new Error("This recording is too large to summarize online (45 MB maximum).");
      if (!response.ok) throw new Error(result.error || "The summary service could not be reached. Please try again.");
      if (typeof result.summary !== "string" || !result.summary.trim()) throw new Error("The summary service returned no usable summary.");
      const updated = { ...note, summary: result.summary.trim() };
      await saveAudioNote(updated);
      setNotes((previous) => previous.map((item) => item.id === note.id ? updated : item));
    } catch (summaryError) {
      setError(summaryError instanceof Error ? summaryError.message : "The summary could not be created. Please try again.");
    } finally { setSummarizingId(null); }
  };

  const removeNote = async (note: AudioNote) => {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    try {
      await deleteAudioNote(note.id);
      setNotes((previous) => previous.filter((item) => item.id !== note.id));
      if (playingId === note.id) setPlayingId(null);
    } catch { setError("This note could not be deleted. Please try again."); }
  };

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = notes.filter((note) => [note.title, note.description, note.category, note.summary || "", ...note.tags].some((value) => value.toLocaleLowerCase().includes(query)));
    return matching.sort((a, b) => {
      switch (sort) {
        case "oldest": return a.createdAt - b.createdAt;
        case "title": return a.title.localeCompare(b.title);
        case "longest": return b.durationMs - a.durationMs;
        case "shortest": return a.durationMs - b.durationMs;
        default: return b.createdAt - a.createdAt;
      }
    });
  }, [notes, search, sort]);

  const active = status === "recording" || status === "paused";
  const statusLabel = { ready: "Ready", recording: "Recording", paused: "Paused", processing: "Processing", "ready-to-save": "Ready to save", saved: "Saved" }[status];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2"><span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400"><Mic className="w-5 h-5" /></span><h1 className="text-xl font-bold">Audio Notes</h1></div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">Record ideas, lectures, meetings, and reminders.</p>
      </header>

      {error && <div role="alert" className="flex gap-2 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
      {warning && <div role="status" className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">{warning}</div>}

      <section aria-label="Audio recorder" className="p-5 sm:p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs text-center space-y-5">
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${status === "recording" ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400" : "bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400"}`}><Mic className="w-8 h-8" /></div>
        <div>
          <p role="status" aria-live="polite" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2">{status === "recording" && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}{statusLabel}</p>
          <p aria-label={`Recording duration ${formatDuration(durationMs)}`} className="text-4xl sm:text-5xl font-mono tabular-nums font-bold text-neutral-900 dark:text-white mt-2">{formatDuration(durationMs)}</p>
          {status === "processing" && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Preparing MP3... {progress ? `${progress}%` : ""}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!active && !draft && status !== "processing" && <button type="button" onClick={startRecording} disabled={busy} className="min-h-12 w-full sm:w-auto px-7 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"><Mic className="w-5 h-5" /> {busy ? "Waiting for microphone..." : "Quick Record"} <span className="sr-only">Start Recording</span></button>}
          {busy && status === "ready" && <button type="button" onClick={cancelMicrophoneRequest} className={secondaryButton}>Cancel request</button>}
          {status === "recording" && <button type="button" onClick={pauseRecording} className={secondaryButton}><Pause className="w-4 h-4" /> Pause Recording</button>}
          {status === "paused" && <button type="button" onClick={resumeRecording} className={secondaryButton}><RotateCcw className="w-4 h-4" /> Resume Recording</button>}
          {active && <button type="button" onClick={stopRecording} className="min-h-11 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"><Square className="w-4 h-4" /> Stop Recording</button>}
          {active && <button type="button" onClick={cancelRecording} className={secondaryButton}><X className="w-4 h-4" /> Cancel Recording</button>}
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Recordings and saved summaries stay on this device. A recording is sent to Google Gemini only if you choose to summarize it.</p>
      </section>

      {draft && <section aria-labelledby="audio-draft-heading" className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h2 id="audio-draft-heading" className="text-lg font-bold">Save this recording</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDuration(draft.durationMs)} · {formatFileSize((draft.mp3Blob ?? draft.rawBlob)?.size ?? 0)} · {noteDate(draft.createdAt)}</p></div><button type="button" onClick={discardDraft} className={secondaryButton}><Trash2 className="w-4 h-4" /> Discard</button></div>
        {draft.mp3Blob ? <><audio controls preload="metadata" src={draftUrl ?? undefined} aria-label="Preview your recorded audio note" className="w-full" /><NoteFields values={fields} onChange={setFields} prefix="new-note" /><div className="flex flex-col sm:flex-row gap-2"><button type="button" onClick={saveDraft} disabled={busy} className="min-h-11 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> Save Note</button><button type="button" onClick={() => downloadBlob(draft.mp3Blob!, safeAudioNoteFilename(fields.title || "Audio Note", draft.createdAt))} className={secondaryButton}><Download className="w-4 h-4" /> Download MP3</button></div></> : <button type="button" onClick={() => prepareMp3(draft)} disabled={status === "processing"} className="min-h-11 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">Prepare MP3</button>}
      </section>}

      <section aria-labelledby="my-audio-notes-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2"><h2 id="my-audio-notes-heading" className="text-lg font-bold">My Audio Notes</h2><span className="text-sm text-neutral-500 dark:text-neutral-400">{notes.length} saved</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <label className="relative"><Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" /><span className="sr-only">Search audio notes</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audio notes..." className={`${fieldClass} pl-10`} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as NoteSort)} className={fieldClass}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">A–Z</option><option value="longest">Longest recording</option><option value="shortest">Shortest recording</option></select></label>
        </div>
        {summaryAvailable === false && <p role="status" className="text-sm text-amber-800 dark:text-amber-200">AI summaries are not available yet. The site owner needs to configure a Gemini API key.</p>}
        {filteredNotes.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500 dark:text-neutral-400">{notes.length ? "No audio notes match your search." : "No saved notes yet. Use Quick Record to make your first one."}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredNotes.map((note) => (
              <article key={note.id} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
                {editingId === note.id ? (
                  <><NoteFields values={editFields} onChange={setEditFields} prefix={`edit-${note.id}`} /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => saveEdit(note)} className="min-h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Save changes</button><button type="button" onClick={() => setEditingId(null)} className={secondaryButton}>Cancel</button></div></>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0"><h3 className="text-base font-bold break-words">{note.title}</h3><p className="text-sm text-neutral-500 dark:text-neutral-400">{noteDate(note.createdAt)} · {formatDuration(note.durationMs)} · {formatFileSize(note.size)}</p>{note.description && <p className="text-sm mt-2 whitespace-pre-wrap break-words">{note.description}</p>}</div>
                      {note.category && <span className="self-start px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-semibold">{note.category}</span>}
                    </div>
                    {note.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{note.tags.map((tag, index) => <span key={`${tag}-${index}`} className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">#{tag}</span>)}</div>}
                    {note.summary && <section aria-label={`Summary of ${note.title}`} className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-4"><h4 className="font-semibold text-violet-800 dark:text-violet-200 mb-2">Written summary</h4><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{note.summary}</p><p className="text-xs text-neutral-600 dark:text-neutral-400 mt-3">AI-generated—check important details against the recording.</p></section>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPlayingId(playingId === note.id ? null : note.id)} className={secondaryButton}><Play className="w-4 h-4" /> {playingId === note.id ? "Close player" : "Play"}</button>
                      <button type="button" onClick={() => summarizeNote(note)} disabled={summaryAvailable === false || summarizingId !== null} className={`${secondaryButton} disabled:opacity-50 disabled:cursor-not-allowed`}><Sparkles className="w-4 h-4" /> {summarizingId === note.id ? "Summarizing..." : note.summary ? "Regenerate summary" : "Summarize"}</button>
                      <button type="button" onClick={() => downloadBlob(note.mp3Blob, safeAudioNoteFilename(note.title, note.createdAt))} className={secondaryButton}><Download className="w-4 h-4" /> Download MP3</button>
                      <button type="button" onClick={() => { setEditingId(note.id); setEditFields({ title: note.title, description: note.description, category: note.category, tags: note.tags.join(", ") }); }} className={secondaryButton}><Pencil className="w-4 h-4" /> Edit</button>
                      <button type="button" onClick={() => removeNote(note)} className={`${secondaryButton} text-red-700 dark:text-red-400`}><Trash2 className="w-4 h-4" /> Delete</button>
                    </div>
                    {summarizingId === note.id && <p role="status" aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-300">Listening to your recording and preparing a summary...</p>}
                    {playingId === note.id && <audio controls autoPlay preload="metadata" src={playingUrl ?? undefined} aria-label={`Play ${note.title}`} className="w-full" />}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
