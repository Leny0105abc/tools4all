import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { getAudioNoteDraft, listAudioNotes, saveAudioNote } from "../src/utils/audioNotesStorage.ts";

test("record, pause, resume, stop, save, reopen, search, edit, download, and delete", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost:3000" });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  Object.defineProperty(dom.window, "isSecureContext", { value: true, configurable: true });
  let microphoneCalls = 0;
  let microphoneFailure: DOMException | null = null;
  const track = { stop() {}, onended: null as (() => void) | null };
  Object.defineProperty(dom.window.navigator, "mediaDevices", { value: { getUserMedia: async () => { microphoneCalls++; if (microphoneFailure) throw microphoneFailure; return { getTracks: () => [track], getAudioTracks: () => [track] }; } } });
  Object.defineProperty(dom.window.navigator, "storage", { value: { estimate: async () => ({ quota: 100_000_000, usage: 0 }) } });
  dom.window.confirm = () => true;
  const downloads: string[] = [];
  dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  Object.assign(URL, { createObjectURL: () => "blob:test", revokeObjectURL: () => {} });

  class MockRecorder {
    static isTypeSupported() { return true; }
    mimeType = "audio/webm";
    state: "inactive" | "recording" | "paused" = "inactive";
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void;
    onerror?: () => void;
    constructor(_stream: unknown, _options: unknown) {}
    start() { this.state = "recording"; }
    pause() { this.state = "paused"; }
    resume() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }) });
      this.onstop?.();
    }
  }
  class MockAudioContext {
    async decodeAudioData() {
      const samples = Float32Array.from({ length: 1152 }, (_, index) => Math.sin(index / 10));
      return { length: samples.length, numberOfChannels: 1, sampleRate: 44100, getChannelData: () => samples };
    }
    async close() {}
  }
  class MockWorker {
    onmessage?: (event: { data: { type: string; blob: Blob } }) => void;
    constructor(_url: URL, _options: unknown) {}
    postMessage() { queueMicrotask(() => this.onmessage?.({ data: { type: "done", blob: new Blob([new Uint8Array([0xff, 0xfb, 0x90, 0x00, 1])], { type: "audio/mpeg" }) } })); }
    terminate() {}
  }
  Object.assign(globalThis, { MediaRecorder: MockRecorder, Worker: MockWorker });
  Object.assign(dom.window, { AudioContext: MockAudioContext, MediaRecorder: MockRecorder, Worker: MockWorker });

  const React = await import("react");
  const { act } = React;
  const { createRoot } = await import("react-dom/client");
  const { default: AudioNotesTool } = await import("../src/components/tools/AudioNotesTool.tsx");
  const container = dom.window.document.getElementById("root")!;
  let root = createRoot(container);
  const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
  const waitFor = async (ready: () => boolean) => {
    for (let attempt = 0; attempt < 20 && !ready(); attempt++) await act(async () => { await settle(); });
    assert.ok(ready(), `expected UI state did not appear: ${container.textContent}`);
  };
  const click = async (name: string) => {
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(name));
    assert.ok(button, `button ${name} is present`);
    await act(async () => { button.click(); await settle(); });
  };
  const fill = async (selector: string, value: string) => {
    const input = container.querySelector(selector) as HTMLInputElement;
    assert.ok(input);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, value);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const selectSort = async (value: string) => {
    const select = container.querySelector("select") as HTMLSelectElement;
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  };
  const noteOrder = () => [...container.querySelectorAll("article h3")].map((heading) => heading.textContent);
  try {
    await act(async () => { root.render(React.createElement(AudioNotesTool, { onActiveChange: () => {} })); });
    await act(async () => { await settle(); });
    assert.equal(microphoneCalls, 0, "microphone is not requested on page load");
    await click("Quick Record");
    assert.equal(microphoneCalls, 1);
    assert.ok(container.textContent?.includes("Recording"));
    await click("Pause Recording");
    assert.ok(container.textContent?.includes("Paused"));
    await click("Resume Recording");
    assert.ok(container.textContent?.includes("Recording"));
    await click("Stop Recording");
    await waitFor(() => !!container.querySelector('audio[aria-label="Preview your recorded audio note"]'));
    for (let attempt = 0; attempt < 20 && !(await getAudioNoteDraft())?.mp3Blob; attempt++) await settle();
    assert.ok((await getAudioNoteDraft())?.mp3Blob, "completed MP3 draft is backed up before a refresh");
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(React.createElement(AudioNotesTool, { onActiveChange: () => {} })); });
    await waitFor(() => !!container.querySelector('audio[aria-label="Preview your recorded audio note"]'));
    await fill("#new-note-title", "TLE 8 Lecture");
    await click("Save Note");
    assert.equal((await listAudioNotes()).length, 1, container.textContent ?? "");
    assert.equal((await listAudioNotes())[0].title, "TLE 8 Lecture");
    const savedNote = (await listAudioNotes())[0];
    await saveAudioNote({ ...savedNote, id: "older-note", title: "Another Note", createdAt: savedNote.createdAt - 60_000, durationMs: savedNote.durationMs + 5000 });

    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(React.createElement(AudioNotesTool, { onActiveChange: () => {} })); });
    await act(async () => { await settle(); });
    assert.ok(container.textContent?.includes("TLE 8 Lecture"), `note survives component reopen: ${container.textContent}`);
    assert.deepEqual(noteOrder(), ["TLE 8 Lecture", "Another Note"]);
    await selectSort("oldest");
    assert.deepEqual(noteOrder(), ["Another Note", "TLE 8 Lecture"]);
    await selectSort("longest");
    assert.deepEqual(noteOrder(), ["Another Note", "TLE 8 Lecture"]);
    await selectSort("newest");
    await fill('input[placeholder="Search audio notes..."]', "missing");
    assert.ok(container.textContent?.includes("No audio notes match"));
    await fill('input[placeholder="Search audio notes..."]', "TLE 8");
    assert.ok(container.textContent?.includes("TLE 8 Lecture"));
    await click("Edit");
    const editTitle = container.querySelector('input[id^="edit-"][id$="-title"]') as HTMLInputElement;
    await fill(`#${editTitle.id}`, "Renamed Lecture");
    await click("Save changes");
    await fill('input[placeholder="Search audio notes..."]', "");
    assert.ok(container.textContent?.includes("Renamed Lecture"));
    await click("Download MP3");
    assert.match(downloads[0], /^Renamed-Lecture-\d{4}-\d{2}-\d{2}\.mp3$/);
    await click("Delete");
    await click("Delete");
    assert.ok(container.textContent?.includes("No saved notes yet"));

    microphoneFailure = new dom.window.DOMException("blocked", "NotAllowedError");
    await click("Quick Record");
    assert.ok(container.textContent?.includes("Microphone access was blocked"));
    microphoneFailure = new dom.window.DOMException("missing", "NotFoundError");
    await click("Quick Record");
    assert.ok(container.textContent?.includes("No microphone was found"));
    microphoneFailure = new dom.window.DOMException("busy", "NotReadableError");
    await click("Quick Record");
    assert.ok(container.textContent?.includes("microphone is unavailable"));
    microphoneFailure = null;
    Object.defineProperty(dom.window, "isSecureContext", { value: false, configurable: true });
    await click("Quick Record");
    assert.ok(container.textContent?.includes("needs a supported browser on a secure HTTPS page"));
    Object.defineProperty(dom.window, "isSecureContext", { value: true, configurable: true });
    await click("Quick Record");
    await click("Cancel Recording");
    assert.equal(await getAudioNoteDraft(), undefined);
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
  }
});
