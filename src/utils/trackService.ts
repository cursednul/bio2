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

export async function fetchServerTracks(): Promise<ServerTrack[]> {
  try {
    const res = await fetch('/api/tracks', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch tracks: ${res.statusText}`);
    }
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.warn('Could not load server tracks:', err);
    return [];
  }
}

export function uploadTrackToServer(
  file: File,
  title: string,
  artist: string,
  onProgress?: (percent: number) => void
): Promise<ServerTrack> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title);
    formData.append('artist', artist);

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
            resolve(resp.track);
          } else {
            reject(new Error(resp.error || 'Server upload failed'));
          }
        } catch (e: any) {
          reject(new Error('Invalid server response: ' + e.message));
        }
      } else {
        try {
          const resp = JSON.parse(xhr.responseText);
          reject(new Error(resp.error || `Server responded with ${xhr.status}`));
        } catch {
          reject(new Error(`Server error (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during audio upload'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Audio upload timed out'));
    };

    xhr.open('POST', '/api/tracks/upload');
    xhr.send(formData);
  });
}

export async function deleteServerTrack(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Failed to delete track from server:', err);
    return false;
  }
}
