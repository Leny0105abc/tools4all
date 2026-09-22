import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteAudioNote,
  deleteAudioNoteDraft,
  getAudioNoteDraft,
  listAudioNotes,
  saveAudioNote,
  saveAudioNoteDraft,
} from "../src/utils/audioNotesStorage.ts";

test("audio drafts and MP3 notes persist and can be edited or deleted", async () => {
  const rawBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" });
  await saveAudioNoteDraft({ id: "current", createdAt: 123, durationMs: 4500, rawBlob });
  const recovered = await getAudioNoteDraft();
  assert.equal(recovered?.durationMs, 4500);
  assert.deepEqual(new Uint8Array(await recovered!.rawBlob!.arrayBuffer()), new Uint8Array([1, 2, 3]));

  const mp3Blob = new Blob([new Uint8Array([0xff, 0xfb, 0x90, 0x00])], { type: "audio/mpeg" });
  await saveAudioNoteDraft({ ...recovered!, mp3Blob });
  assert.equal((await getAudioNoteDraft())?.mp3Blob?.type, "audio/mpeg");

  const note = {
    id: "test-note", title: "Lecture", description: "Science class", category: "School", tags: ["study"],
    createdAt: 123, durationMs: 4500, size: mp3Blob.size, mp3Blob,
  };
  await saveAudioNote(note);
  assert.equal((await listAudioNotes())[0].title, "Lecture");
  await saveAudioNote({ ...note, title: "Renamed lecture" });
  assert.equal((await listAudioNotes())[0].title, "Renamed lecture");
  await deleteAudioNoteDraft();
  assert.equal(await getAudioNoteDraft(), undefined);
  await deleteAudioNote(note.id);
  assert.deepEqual(await listAudioNotes(), []);
});
