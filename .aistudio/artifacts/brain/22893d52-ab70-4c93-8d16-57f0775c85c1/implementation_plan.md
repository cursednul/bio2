# Audio System Architecture & Full-Stack Implementation Plan

Rework the entire audio subsystem from fragile client-side chunking to a production-grade, server-backed audio upload and HTTP byte-range streaming architecture. This ensures 100% reliable uploads, cross-device playback synchronization for all visitors, instant scrubber seeking, and a protected music catalog in the Admin modal.

---

## 1. Architecture & Backend Pipeline

### A. Full-Stack Express Server Integration (`server.ts`)
- **Mount Vite Dev Middleware in Dev**: Run Express on port 3000 in dev via `tsx server.ts` (`npm run dev`) and production via `node server.ts` (`npm start`).
- **Static Audio Storage**: Create and manage `/uploads/tracks/` directory for stored audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) and `/uploads/tracks.json` for catalog metadata index.
- **REST Audio API**:
  1. `POST /api/tracks/upload`:
     - Accepts `multipart/form-data` audio file with title and artist fields.
     - Validates audio file types and size limits (up to 50MB).
     - Generates unique ID, persists audio file to disk, records metadata (id, title, artist, filename, size, duration, createdAt).
     - Automatically updates or syncs with Firestore global settings if set as active.
  2. `GET /api/tracks`:
     - Returns JSON array of all uploaded tracks with their ID, title, artist, file size, stream URL, and active status.
  3. `GET /api/tracks/:id/stream`:
     - High-performance audio streaming endpoint supporting standard HTTP `Range` headers (`Accept-Ranges: bytes`, `206 Partial Content`, `Content-Range`).
     - Enables instant audio seeking, scrub dragging, low latency buffering, and seamless cross-browser playback across all devices.
  4. `POST /api/tracks/:id/activate`:
     - Marks the track as the globally active song.
     - Updates Firestore `settings/global` doc (`activeSongId`, `activeSongTitle`, `activeSongArtist`, `activeSongUrl`) so every active client automatically synchronizes in real time.
  5. `DELETE /api/tracks/:id`:
     - Safely deletes the file from disk and catalog index.
     - If the deleted track was active, resets the active track or falls back cleanly.

---

## 2. Frontend User Interface & Player Upgrade

### A. Floating Audio Player Bar (`src/components/AudioPlayerBar.tsx`)
- **Design & Layout**:
  - Pinned floating glassmorphism dock at the bottom of the screen with subtle border and backdrop blur.
  - Vinyl disc animation that rotates smoothly when audio is actively playing and stops smoothly on pause.
  - Track metadata: Song title, artist name, and live playback status.
- **Interactive Seek Scrubber**:
  - Interactive progress track with a buffered progress indicator, current playback bar, and drag-and-click seek thumb.
  - Monospace time labels (`01:23 / 03:45`) that update smoothly during playback.
  - Native scrubbing via `audio.currentTime` connected to the byte-range streaming server endpoint for zero-delay jumps.
- **Playback Controls**:
  - Play/Pause toggle with spring animation.
  - Volume button with hover/click expandable volume slider and 1-click mute toggle (saves volume preference in `localStorage`).
  - Protected admin shortcut (`+` button) only rendered if the user is authenticated as Admin.

### B. Admin Music Catalog (`src/components/AdminModal.tsx`)
- **Strict Security & Zero Leakage**:
  - No passcodes, hints, or quick-unlock buttons rendered anywhere in the UI.
  - Secret access trigger preserved (10 clicks on the aesthetic corner star `✦`).
  - Admin authentication strictly validated against `2gviT4_`.
- **Music Management Tab**:
  - **Dropzone & File Picker**: Clean drag-and-drop zone with instant file validation, upload progress bar, and instant feedback.
  - **Song Catalog List**:
    - Displays all server-stored tracks with title, artist, upload date, and file size.
    - Status badge indicating which track is currently "LIVE FOR EVERYONE".
    - "Set as Active Song" button: Broadcasts track to all active visitors across the site in real time.
    - "Preview" button: Allows the admin to preview any track locally before making it live.
    - "Delete" button with confirmation prompt.

---

## 3. Real-Time Synchronization & Error Handling

- **Cross-Device Sync**:
  - Real-time listener on Firestore `settings/global` detects active song changes.
  - When an admin selects a track, all active sessions and newly joining visitors instantly receive the updated track stream URL and metadata.
- **Resilience & Fallback**:
  - If no custom track is uploaded or active, the player cleanly handles the empty state without console errors or hook mismatch bugs.
  - Browser autoplay policy handling: Shows an unobtrusive "Click to listen" / play button if browser security blocks automated audio start.
  - Graceful handling of network drops with retry logic for audio streaming.

---

## 4. Verification Plan

- **Step 1: Dependency Check**: Verify `multer` and `@types/multer` installation for multipart streaming.
- **Step 2: Server Verification**: Test `server.ts` routes (`/api/tracks`, `/api/tracks/upload`, `/api/tracks/:id/stream`) in both dev and preview environments.
- **Step 3: End-to-End Upload Flow**:
  - Authenticate into Admin modal via secret star trigger.
  - Upload MP3 audio file; verify progress bar and successful persistence in `/uploads/tracks/`.
  - Verify track appears in the Admin catalog.
- **Step 4: Live Broadcast & Streaming**:
  - Click "Set as Active Song" in Admin modal.
  - Confirm player bar at the bottom updates title, artist, duration, and streams audio smoothly.
  - Test seek scrubber: click at 25%, 50%, 75% marks to verify byte-range instant seeking.
  - Test volume slider and mute toggle.
- **Step 5: Code Quality & Lint**: Run `compile_applet` and `lint_applet` to ensure zero compilation or React hook errors.
