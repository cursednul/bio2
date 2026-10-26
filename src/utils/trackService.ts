import { storeAudioBlob, deleteAudioBlob } from './audioStorage';

export interface ServerTrack {
  id: string;
  title: string;
  artist: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  streamUrl: string;
}

// Default audio tracks catalog
export const BUNDLED_DEFAULT_TRACKS: ServerTrack[] = [];

const LOCAL_STORAGE_TRACKS_KEY = 'cursed_local_uploaded_tracks';
const LOCAL_STORAGE_DELETED_KEY = 'cursed_deleted_track_ids';

export function getDeletedTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function markTrackAsDeleted(id: string): void {
  try {
    const current = getDeletedTrackIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore
  }
}

function getLocalStoredTracks(): ServerTrack[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRACKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveLocalTrack(track: ServerTrack): void {
  try {
    const tracks = getLocalStoredTracks();
    const filtered = tracks.filter((t) => t.id !== track.id);
    filtered.unshift(track);
    localStorage.setItem(LOCAL_STORAGE_TRACKS_KEY, JSON.stringify(filtered.slice(0, 30)));
  } catch {
    // Ignore
  }
}

export async function fetchServerTracks(): Promise<ServerTrack[]> {
  const localTracks = getLocalStoredTracks();
  const deletedIds = new Set(getDeletedTrackIds());

  let rawList: ServerTrack[] = [];
  try {
    const res = await fetch('/api/tracks', { cache: 'no-store' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        const serverTracks: ServerTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
        rawList = serverTracks;
      }
    }
  } catch {
    // Server fetch unreachable
  }

  const combined = new Map<string, ServerTrack>();
  rawList.forEach((t) => {
    if (!deletedIds.has(t.id)) combined.set(t.id, t);
  });
  localTracks.forEach((t) => {
    if (!deletedIds.has(t.id)) combined.set(t.id, t);
  });
  BUNDLED_DEFAULT_TRACKS.forEach((t) => {
    if (!deletedIds.has(t.id)) combined.set(t.id, t);
  });

  return Array.from(combined.values());
}

export function uploadTrackToServer(
  file: File,
  title: string,
  artist: string,
  onProgress?: (percent: number) => void
): Promise<ServerTrack> {
  return new Promise(async (resolve) => {
    const trackId = `track_${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    const cleanTitle = (title || file.name.replace(/\.[^/.]+$/, '')).trim();
    const cleanArtist = (artist || 'cursed').trim();

    // Setup local fallback immediately so the user never loses access to the file
    let localBlobUrl = '';
    try {
      localBlobUrl = await storeAudioBlob(trackId, file, cleanTitle, cleanArtist);
    } catch {
      try {
        localBlobUrl = URL.createObjectURL(file);
      } catch {
        localBlobUrl = '';
      }
    }

    const fallbackTrack: ServerTrack = {
      id: trackId,
      title: cleanTitle,
      artist: cleanArtist,
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'audio/mpeg',
      size: file.size,
      createdAt: new Date().toISOString(),
      streamUrl: localBlobUrl || '',
    };

    // Try posting to /api/tracks/upload
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', cleanTitle);
    formData.append('artist', cleanArtist);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.success && resp.track) {
            saveLocalTrack(resp.track);
            resolve(resp.track);
            return;
          }
        } catch {
          // Response was not JSON (e.g. HTML from SPA redirect)
        }
      }
      // Server returned non-200 or non-JSON: gracefully succeed with local storage fallback
      saveLocalTrack(fallbackTrack);
      resolve(fallbackTrack);
    };

    xhr.onerror = () => {
      // Network error: gracefully succeed with local storage fallback
      saveLocalTrack(fallbackTrack);
      resolve(fallbackTrack);
    };

    xhr.ontimeout = () => {
      // Timeout: gracefully succeed with local storage fallback
      saveLocalTrack(fallbackTrack);
      resolve(fallbackTrack);
    };

    try {
      xhr.open('POST', '/api/tracks/upload');
      xhr.send(formData);
    } catch {
      saveLocalTrack(fallbackTrack);
      resolve(fallbackTrack);
    }
  });
}

export async function deleteServerTrack(id: string): Promise<boolean> {
  markTrackAsDeleted(id);
  deleteAudioBlob(id).catch(() => {});

  // Remove from local storage
  try {
    const local = getLocalStoredTracks().filter((t) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_TRACKS_KEY, JSON.stringify(local));
  } catch {
    // Ignore
  }

  // Attempt server deletion if applicable
  try {
    const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return !!data.success;
      }
    }
  } catch {
    // Ignore server error
  }
  return true;
}
