import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DB_NAME = 'cursed_audio_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      const meta = result.slice(0, commaIndex);
      const mimeMatch = meta.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'audio/mpeg';
      const base64 = result.slice(commaIndex + 1);
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function storeAudioBlob(id: string, file: Blob, title: string, artist: string): Promise<string> {
  try {
    const database = await openDB();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
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

    return URL.createObjectURL(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

export async function deleteAudioBlob(id: string): Promise<boolean> {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// Uploads audio to Firestore in 400KB chunks so any device can stream it
export async function uploadAudioChunksToFirestore(
  trackId: string,
  file: File,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<{ totalChunks: number; mimeType: string }> {
  const { base64, mimeType } = await fileToBase64(file);
  const CHUNK_SIZE = 400 * 1024; // 400KB safe chunk size (Firestore doc limit is 1MB)
  const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

  const chunksCollection = collection(db, 'tracks', trackId, 'chunks');

  // Upload in controlled batches of 3 chunks at a time to prevent iframe socket saturation
  const BATCH_SIZE = 3;
  for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
    const batchPromises = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
      const chunkData = base64.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
      const chunkDocRef = doc(chunksCollection, String(j).padStart(4, '0'));
      batchPromises.push(
        setDoc(chunkDocRef, {
          index: j,
          total: totalChunks,
          mimeType,
          data: chunkData,
          createdAt: new Date().toISOString(),
        })
      );
    }
    await Promise.all(batchPromises);

    const completed = Math.min(i + BATCH_SIZE, totalChunks);
    const percent = Math.round((completed / totalChunks) * 100);
    if (onProgress) {
      onProgress(percent, completed, totalChunks);
    }
  }

  return { totalChunks, mimeType };
}

// Fetches audio chunks from Firestore and reconstructs Blob on any device (phone, laptop, visitor)
export async function fetchAudioChunksFromFirestore(trackId: string): Promise<Blob | string | null> {
  try {
    // 1. Fetch chunks collection without requiring composite index ordering
    const snapshot = await getDocs(collection(db, 'tracks', trackId, 'chunks'));
    if (snapshot.empty) {
      // Check if parent track document has direct audioUrl or Base64 data
      try {
        const trackSnap = await getDoc(doc(db, 'tracks', trackId));
        if (trackSnap.exists()) {
          const d = trackSnap.data();
          if (
            d?.audioUrl &&
            (d.audioUrl.startsWith('http://') ||
              d.audioUrl.startsWith('https://') ||
              d.audioUrl.startsWith('data:') ||
              d.audioUrl.startsWith('blob:'))
          ) {
            return d.audioUrl;
          }
        }
      } catch {
        // Ignore doc lookup
      }
      return null;
    }

    // Sort chunk docs safely in JS memory by index
    const sortedDocs = snapshot.docs
      .map((d) => d.data())
      .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));

    let mimeType = 'audio/mpeg';
    const parts: string[] = [];
    sortedDocs.forEach((d) => {
      if (d.mimeType) mimeType = d.mimeType;
      if (typeof d.data === 'string') {
        parts.push(d.data);
      }
    });

    const fullBase64 = parts.join('');
    if (!fullBase64) return null;

    // Convert Base64 string to Blob safely in chunks without stack overflow
    const byteCharacters = atob(fullBase64);
    const sliceSize = 1024 * 16;
    const byteArrays: BlobPart[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Uint8Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(byteNumbers);
    }

    const blob = new Blob(byteArrays, { type: mimeType });

    // Cache locally in IndexedDB on this device for instant replay
    try {
      await storeAudioBlob(trackId, blob, 'Track', 'Unknown');
    } catch {
      // Ignore cache error
    }

    return blob;
  } catch (err) {
    console.warn('Failed to fetch audio chunks from Firestore:', err);
    return null;
  }
}

// Universal resolver that works seamlessly on desktop and mobile devices
export async function getStoredAudioUrl(idOrUrl: string): Promise<string | null> {
  if (!idOrUrl || !idOrUrl.trim()) return null;
  const clean = idOrUrl.trim();

  // If it's a blob URL, data URL, or http/https URL, return as-is
  if (
    clean.startsWith('blob:') ||
    clean.startsWith('data:') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    return clean;
  }

  // Extract clean track ID
  const isFirestore = clean.startsWith('firestore://');
  const trackId = clean.replace(/^firestore:\/\//, '');

  if (isFirestore || trackId.startsWith('track_')) {
    // 1. Check local IndexedDB cache first
    try {
      const database = await openDB();
      const localUrl = await new Promise<string | null>((resolve) => {
        const tx = database.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(trackId);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(URL.createObjectURL(req.result.blob));
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });

      if (localUrl) return localUrl;
    } catch {
      // Fall through to Firestore cloud chunks
    }

    // 2. Fetch from Firestore server (enables cross-device sync on phone, tablet, other PCs)
    try {
      const cloudRes = await fetchAudioChunksFromFirestore(trackId);
      if (cloudRes) {
        if (typeof cloudRes === 'string') return cloudRes;
        return URL.createObjectURL(cloudRes);
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export async function calculateAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    let resolved = false;
    const tempUrl = URL.createObjectURL(file);
    const audio = new Audio();

    const finish = (duration: number) => {
      if (resolved) return;
      resolved = true;
      try {
        URL.revokeObjectURL(tempUrl);
      } catch {
        // Ignore
      }
      resolve(duration);
    };

    // Safety timeout in case browser delays audio metadata loading
    const timer = setTimeout(() => finish(0), 1500);

    audio.preload = 'metadata';
    audio.src = tempUrl;
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      finish(Math.round(audio.duration) || 0);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      finish(0);
    };
  });
}
