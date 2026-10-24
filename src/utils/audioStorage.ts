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

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function storeAudioBlob(id: string, file: Blob, title: string, artist: string): Promise<string> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
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
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    // If file is under 2.5MB, convert to Data URL for portable playback
    if (file.size <= 2.5 * 1024 * 1024 && file instanceof File) {
      const dataUrl = await fileToDataUrl(file);
      return dataUrl;
    }

    // Otherwise return track ID or object URL
    const objectUrl = URL.createObjectURL(file);
    return objectUrl;
  } catch {
    if (file instanceof File) {
      try {
        return await fileToDataUrl(file);
      } catch {
        return URL.createObjectURL(file);
      }
    }
    return URL.createObjectURL(file);
  }
}

export async function getStoredAudioUrl(idOrUrl: string): Promise<string | null> {
  if (!idOrUrl || !idOrUrl.trim()) return null;
  const clean = idOrUrl.trim();

  // If it's a data URL or http/https URL, return as-is
  if (clean.startsWith('data:') || clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // If it's a track ID, check IndexedDB
  if (clean.startsWith('track_')) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(clean);
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

  // Return as-is if it's already a blob URL or path
  return clean;
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
