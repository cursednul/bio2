import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Setup upload directory
const UPLOADS_DIR = path.resolve(__dirname, 'uploads', 'tracks');
const CATALOG_FILE = path.resolve(__dirname, 'uploads', 'tracks.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface TrackRecord {
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

function loadCatalog(): TrackRecord[] {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const data = fs.readFileSync(CATALOG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading tracks catalog:', err);
  }
  return [];
}

function saveCatalog(tracks: TrackRecord[]): void {
  try {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(tracks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving tracks catalog:', err);
  }
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `track-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
    if (file.mimetype.startsWith('audio/') || validExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (.mp3, .wav, .ogg, .m4a, .aac, .flac)'));
    }
  },
});

// JSON and form parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for development preview
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Get all tracks
app.get('/api/tracks', (_req, res) => {
  try {
    const tracks = loadCatalog();
    res.json({ success: true, tracks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list tracks' });
  }
});

// 2. Upload a new track
app.post('/api/tracks/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const { title, artist } = req.body;
    const cleanTitle = (title || req.file.originalname.replace(/\.[^/.]+$/, '')).trim();
    const cleanArtist = (artist || 'Unknown Artist').trim();
    const trackId = path.parse(req.file.filename).name;

    const newTrack: TrackRecord = {
      id: trackId,
      title: cleanTitle,
      artist: cleanArtist,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'audio/mpeg',
      size: req.file.size,
      createdAt: new Date().toISOString(),
      streamUrl: `/api/tracks/${trackId}/stream`,
    };

    const catalog = loadCatalog();
    catalog.unshift(newTrack);
    saveCatalog(catalog);

    return res.status(201).json({
      success: true,
      track: newTrack,
      message: 'Audio uploaded successfully',
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Audio upload failed' });
  }
});

// 3. Audio streaming with byte-range support for seeking
app.get('/api/tracks/:id/stream', (req, res) => {
  try {
    const { id } = req.params;
    const catalog = loadCatalog();
    const track = catalog.find((t) => t.id === id);

    let filePath: string;
    if (track) {
      filePath = path.join(UPLOADS_DIR, track.filename);
    } else {
      // Fallback: check directly in UPLOADS_DIR
      const files = fs.readdirSync(UPLOADS_DIR);
      const match = files.find((f) => f.startsWith(id));
      if (match) {
        filePath = path.join(UPLOADS_DIR, match);
      } else {
        return res.status(404).json({ error: 'Track not found' });
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };
    const contentType = mimeMap[ext] || 'audio/mpeg';

    if (range) {
      // Parse Range header e.g. "bytes=32324-" or "bytes=0-1000"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Audio streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error streaming audio' });
    }
  }
});

// 4. Delete track
app.delete('/api/tracks/:id', (req, res) => {
  try {
    const { id } = req.params;
    let catalog = loadCatalog();
    const trackIndex = catalog.findIndex((t) => t.id === id);

    if (trackIndex === -1) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    const track = catalog[trackIndex];
    const filePath = path.join(UPLOADS_DIR, track.filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.warn('Could not delete physical audio file:', fileErr);
      }
    }

    catalog.splice(trackIndex, 1);
    saveCatalog(catalog);

    return res.json({ success: true, message: 'Track deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete track' });
  }
});

// ==========================================
// VITE DEV SERVER OR STATIC PRODUCTION BUILD
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const publicPath = path.resolve(__dirname, 'public');

  if (!isProd && !fs.existsSync(path.resolve(distPath, 'index.html'))) {
    // Mount Vite in dev mode
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in dev mode');
    } catch (viteErr) {
      console.error('Could not start Vite middleware:', viteErr);
    }
  } else {
    // Production / built mode
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use('/bio2', express.static(distPath));
    }
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
      app.use('/bio2', express.static(publicPath));
    }
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('Application building, please refresh in a moment...');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cursed full-stack audio server listening on port ${PORT}`);
  });
}

startServer();
