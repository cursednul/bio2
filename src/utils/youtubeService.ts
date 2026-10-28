export interface YouTubeTrackResult {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationStr: string;
  durationSec: number;
  url: string;
}

// Extracts clean 11-character YouTube video ID from various URL formats or raw ID
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim();

  // youtube://<videoId> format
  if (clean.startsWith('youtube://')) {
    const id = clean.replace('youtube://', '').trim();
    return id.length >= 11 ? id.slice(0, 11) : id;
  }

  // Raw 11-char ID format (e.g., dQw4w9WgXcQ)
  if (/^[a-zA-Z0-9_\-]{11}$/.test(clean)) {
    return clean;
  }

  // URL matching (youtube.com, music.youtube.com, youtu.be)
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = clean.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  return null;
}

// Formats YouTube video ID into a standardized stream URI stored in database
export function formatYouTubeStreamUrl(videoId: string): string {
  return `youtube://${videoId}`;
}

// Popular YouTube Music fallback results when offline or search fails
const POPULAR_YT_MUSIC_PRESETS: YouTubeTrackResult[] = [
  {
    id: 'yt_L_LUpnjgPso',
    videoId: 'L_LUpnjgPso',
    title: 'Cyberpunk Synthwave Night Drive',
    artist: 'Nightrunner',
    thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg',
    durationStr: '3:45',
    durationSec: 225,
    url: 'youtube://L_LUpnjgPso',
  },
  {
    id: 'yt_fJ9rUzIMcZQ',
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    durationStr: '5:55',
    durationSec: 355,
    url: 'youtube://fJ9rUzIMcZQ',
  },
  {
    id: 'yt_hT_nvWreIhg',
    videoId: 'hT_nvWreIhg',
    title: 'Counting Stars',
    artist: 'OneRepublic',
    thumbnail: 'https://img.youtube.com/vi/hT_nvWreIhg/hqdefault.jpg',
    durationStr: '4:17',
    durationSec: 257,
    url: 'youtube://hT_nvWreIhg',
  },
  {
    id: 'yt_2Vv-BfVoq4g',
    videoId: '2Vv-BfVoq4g',
    title: 'Ed Sheeran - Perfect',
    artist: 'Ed Sheeran',
    thumbnail: 'https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
    durationStr: '4:23',
    durationSec: 263,
    url: 'youtube://2Vv-BfVoq4g',
  },
  {
    id: 'yt_WneLU8985_Y',
    videoId: 'WneLU8985_Y',
    title: 'Dynoro & Fライン - In My Mind',
    artist: 'Dynoro',
    thumbnail: 'https://img.youtube.com/vi/WneLU8985_Y/hqdefault.jpg',
    durationStr: '3:04',
    durationSec: 184,
    url: 'youtube://WneLU8985_Y',
  },
];

// Performs search query against public YouTube Music / Piped search API with fallback
export async function searchYouTubeMusic(queryStr: string): Promise<YouTubeTrackResult[]> {
  if (!queryStr || !queryStr.trim()) return [];
  const cleanQuery = queryStr.trim();

  // If user pasted a YouTube link or video ID directly
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) {
    return [
      {
        id: `yt_${directId}`,
        videoId: directId,
        title: cleanQuery.includes('http') ? 'YouTube Track' : cleanQuery,
        artist: 'YouTube Music',
        thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
        durationStr: '3:30',
        durationSec: 210,
        url: `youtube://${directId}`,
      },
    ];
  }

  // 1. First Priority: Call local backend endpoint (no CORS, live YouTube scraping + oEmbed)
  try {
    const apiRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(cleanQuery)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.success && Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('Backend YouTube search endpoint failed, trying client fallbacks:', err);
  }

  // Attempt public YouTube search API (Piped)
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.moomoo.me',
    'https://pipedapi.privacy.com.de',
    'https://api.piped.victr.me',
    'https://pipedapi.drgns.space',
    'https://pipedapi.us.to'
  ];

  for (const instance of pipedInstances) {
    try {
      // Try with music filter first
      const searchUrl = `${instance}/search?q=${encodeURIComponent(cleanQuery)}&filter=music_songs`;
      const res = await fetch(searchUrl, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(3000) 
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const results = data.items
            .filter((item: any) => item.type === 'stream' && item.url)
            .slice(0, 10)
            .map((item: any) => {
              const vId = item.url.replace('/watch?v=', '');
              const durationSec = Number(item.duration) || 180;
              const m = Math.floor(durationSec / 60);
              const s = Math.floor(durationSec % 60);
              return {
                id: `yt_${vId}`,
                videoId: vId,
                title: item.title || 'Untitled Track',
                artist: item.uploaderName || 'YouTube Artist',
                thumbnail: item.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                durationStr: `${m}:${s < 10 ? '0' : ''}${s}`,
                durationSec,
                url: `youtube://${vId}`,
              };
            });

          if (results.length > 0) return results;
        }
      }
    } catch {
      continue;
    }
  }

  // Secondary search fallback via invidious API
  const invidiousInstances = [
    'https://inv.tux.rs',
    'https://yewtu.be',
    'https://invidious.io.lol',
    'https://inv.n8low.com',
    'https://invidious.snopyta.org'
  ];

  for (const instance of invidiousInstances) {
    try {
      const invUrl = `${instance}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`;
      const res = await fetch(invUrl, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(3000)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data
            .slice(0, 10)
            .map((item: any) => {
              const vId = item.videoId;
              const durationSec = Number(item.lengthSeconds) || 180;
              const m = Math.floor(durationSec / 60);
              const s = Math.floor(durationSec % 60);
              return {
                id: `yt_${vId}`,
                videoId: vId,
                title: item.title || 'Untitled Track',
                artist: item.author || 'YouTube Artist',
                thumbnail: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                durationStr: `${m}:${s < 10 ? '0' : ''}${s}`,
                durationSec,
                url: `youtube://${vId}`,
              };
            });
        }
      }
    } catch {
      continue;
    }
  }

  // Filter preset fallback list by query keywords
  const lower = cleanQuery.toLowerCase();
  const matchedPresets = POPULAR_YT_MUSIC_PRESETS.filter(
    (p) => p.title.toLowerCase().includes(lower) || p.artist.toLowerCase().includes(lower)
  );

  return matchedPresets;
}
