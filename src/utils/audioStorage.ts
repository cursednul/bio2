// IndexedDB persistence for uploaded audio files to bypass 1MB Firestore doc limits

const DB_NAME = 'cursed_audio_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeAudioBlob(id: string, file: Blob, title: string, artist: string): Promise<string> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: file,
        title,
        artist,
        savedAt: new Date().toISOString(),
      };
      store.put(record);
      tx.oncomplete = () => {
        const objectUrl = URL.createObjectURL(file);
        resolve(objectUrl);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback: return temporary blob URL
    return URL.createObjectURL(file);
  }
}

export async function getStoredAudioUrl(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const url = URL.createObjectURL(req.result.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function calculateAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = tempUrl;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(Math.round(audio.duration) || 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(0);
    };
  });
}
