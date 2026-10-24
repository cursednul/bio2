import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Resolve directories
const distPath = path.resolve(__dirname, 'dist');
const publicPath = path.resolve(__dirname, 'public');

// Serve static assets from dist
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use('/bio2', express.static(distPath));
}

// Also serve public assets as backup
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.use('/bio2', express.static(publicPath));
}

// Fallback all routes to dist/index.html (SPA routing)
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  const indexPath = path.resolve(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Building application, please refresh in a moment...');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
