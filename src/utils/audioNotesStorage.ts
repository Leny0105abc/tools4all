export interface AudioNote {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: number;
  durationMs: number;
  size: number;
  mp3Blob: Blob;
  transcript?: string;
}

export interface AudioNoteDraft {
  id: "current";
  createdAt: number;
  durationMs: number;
  rawBlob?: Blob;
  mp3Blob?: Blob;
}

const DB_NAME = "tools4all-audio-notes";
const DB_VERSION = 1;
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("notes")) database.createObjectStore("notes", { keyPath: "id" });
        if (!database.objectStoreNames.contains("drafts")) database.createObjectStore("drafts", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise!;
}

async function read<T>(storeName: "notes" | "drafts", action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function write(storeName: "notes" | "drafts", action: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    action(transaction.objectStore(storeName));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function listAudioNotes(): Promise<AudioNote[]> {
  return read("notes", (store) => store.getAll());
}

export function getAudioNoteDraft(): Promise<AudioNoteDraft | undefined> {
  return read("drafts", (store) => store.get("current"));
}

export function saveAudioNote(note: AudioNote): Promise<void> {
  return write("notes", (store) => { store.put(note); });
}

export function deleteAudioNote(id: string): Promise<void> {
  return write("notes", (store) => { store.delete(id); });
}

export function saveAudioNoteDraft(draft: AudioNoteDraft): Promise<void> {
  return write("drafts", (store) => { store.put(draft); });
}

export function deleteAudioNoteDraft(): Promise<void> {
  return write("drafts", (store) => { store.delete("current"); });
}
