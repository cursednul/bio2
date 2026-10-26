import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Trash2,
  Megaphone,
  Gamepad2,
  Music2,
  LayoutGrid,
  Rows,
  Grid3X3,
  Gauge,
  Download,
  Terminal,
  Sparkles,
  Layers,
  Upload,
  Link,
  Play,
  Pause,
  Volume2,
  Radio,
  User,
  Save,
  Check,
  Youtube,
  Search,
} from 'lucide-react';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { SocialsViewMode, AudioTrack, GlobalSettingsDoc } from '../types';
import { sound } from '../utils/audio';
import { uploadAudioChunksToFirestore, storeAudioBlob } from '../utils/audioStorage';
import {
  uploadTrackToServer,
  fetchServerTracks,
  deleteServerTrack,
  getDeletedTrackIds,
  ServerTrack,
} from '../utils/trackService';
import {
  searchYouTubeMusic,
  YouTubeTrackResult,
  formatYouTubeStreamUrl,
  extractYouTubeVideoId,
} from '../utils/youtubeService';

export type AdminTab = 'general' | 'audio' | 'profile' | 'broadcast' | 'moderation';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  initialTab?: AdminTab;
  // Live State
  socialsViewMode: SocialsViewMode;
  onSetSocialsViewMode: (mode: SocialsViewMode) => void;
  favGame: string;
  onSetFavGame: (game: string) => void;
  favSong: string;
  onSetFavSong: (song: string) => void;
  announcement: string;
  announcementActive: boolean;
  onSetAnnouncement: (msg: string, active: boolean) => void;
  motionPreset: 'flow' | 'hyper' | 'calm';
  onSetMotionPreset: (preset: 'flow' | 'hyper' | 'calm') => void;
  nickname: string;
  onSetNickname: (name: string) => void;
  bioEmoticon: string;
  onSetBioEmoticon: (bio: string) => void;
  avatarUrl: string;
  onSetAvatarUrl: (url: string) => void;
  activeSongTitle: string;
  activeSongArtist: string;
  activeSongUrl: string;
  onSetActiveSong: (title: string, artist: string, url: string) => void;
  onClearAllComments: () => void;
  commentCount: number;
  onExportComments: () => void;
  showToast: (msg: string) => void;
}

const ADMIN_EMAIL = 'kirya2010777@gmail.com';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
  initialTab = 'audio',
  socialsViewMode,
  onSetSocialsViewMode,
  favGame,
  onSetFavGame,
  favSong,
  onSetFavSong,
  announcement,
  announcementActive,
  onSetAnnouncement,
  motionPreset,
  onSetMotionPreset,
  nickname,
  onSetNickname,
  bioEmoticon,
  onSetBioEmoticon,
  avatarUrl,
  onSetAvatarUrl,
  activeSongTitle,
  activeSongArtist,
  activeSongUrl,
  onSetActiveSong,
  onClearAllComments,
  commentCount,
  onExportComments,
  showToast,
}) => {
  const [isAuthenticatingGoogle, setIsAuthenticatingGoogle] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Draft form states
  const [gameDraft, setGameDraft] = useState(favGame);
  const [songDraft, setSongDraft] = useState(favSong);
  const [announceDraft, setAnnounceDraft] = useState(announcement);
  const [announceActiveDraft, setAnnounceActiveDraft] = useState(announcementActive);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [bioDraft, setBioDraft] = useState(bioEmoticon);
  const [avatarDraft, setAvatarDraft] = useState(avatarUrl);

  // Audio Upload draft states
  const [uploadSongTitle, setUploadSongTitle] = useState('');
  const [uploadSongArtist, setUploadSongArtist] = useState('');
  const [uploadSongUrl, setUploadSongUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingTrack, setIsUploadingTrack] = useState(false);
  const [savedTracks, setSavedTracks] = useState<AudioTrack[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube Music search state
  const [musicSubTab, setMusicSubTab] = useState<'ytmusic' | 'upload'>('ytmusic');
  const [ytQuery, setYtQuery] = useState('');
  const [ytResults, setYtResults] = useState<YouTubeTrackResult[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);

  const handleSearchYt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = ytQuery.trim() || 'In My Mind';
    setIsSearchingYt(true);
    sound.playClick();
    try {
      const res = await searchYouTubeMusic(clean);
      setYtResults(res);
    } catch {
      showToast('YouTube Music search failed');
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleBroadcastYtTrack = async (item: YouTubeTrackResult) => {
    sound.playChime();
    const trackId = item.id;
    const finalAudioUrl = item.url;

    onSetActiveSong(item.title, item.artist, finalAudioUrl);
    onSetFavSong(item.title);

    await saveGlobalSettingsToFirestore({
      activeSongId: trackId,
      activeSongTitle: item.title.slice(0, 100),
      activeSongArtist: item.artist.slice(0, 100),
      activeSongUrl: finalAudioUrl,
      favSong: item.title.slice(0, 64),
    });

    await setDoc(doc(db, 'tracks', trackId), {
      title: item.title.slice(0, 100),
      artist: item.artist.slice(0, 100),
      audioUrl: finalAudioUrl,
      sourceType: 'preset',
      duration: item.durationSec,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    showToast(`Broadcasted from YouTube Music: ${item.title} 🎵`);
  };

  // Sync draft states and initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setGameDraft(favGame);
      setSongDraft(favSong);
      setAnnounceDraft(announcement);
      setAnnounceActiveDraft(announcementActive);
      setNicknameDraft(nickname);
      setBioDraft(bioEmoticon);
      setAvatarDraft(avatarUrl);
      if (ytResults.length === 0) {
        handleSearchYt();
      }
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewTrackId(null);
    }
  }, [isOpen, initialTab, favGame, favSong, announcement, announcementActive, nickname, bioEmoticon, avatarUrl]);

  // Load Tracks from both Server Catalog and Firestore
  const loadTracks = async () => {
    try {
      const deletedSet = new Set(getDeletedTrackIds());
      const serverTracks = await fetchServerTracks();
      const mappedServerTracks: AudioTrack[] = serverTracks
        .filter((t) => !deletedSet.has(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          audioUrl: t.streamUrl,
          sourceType: 'upload',
          duration: 0,
          createdAt: t.createdAt,
        }));

      setSavedTracks((prev) => {
        const map = new Map<string, AudioTrack>();
        mappedServerTracks.forEach((st) => map.set(st.id, st));
        prev.forEach((pt) => {
          if (!map.has(pt.id) && !deletedSet.has(pt.id)) {
            map.set(pt.id, pt);
          }
        });
        return Array.from(map.values());
      });
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadTracks();

    const q = query(collection(db, 'tracks'), limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const deletedSet = new Set(getDeletedTrackIds());
        const firestoreTracks: AudioTrack[] = [];
        snapshot.forEach((docSnap) => {
          if (!deletedSet.has(docSnap.id)) {
            const d = docSnap.data();
            firestoreTracks.push({
              id: docSnap.id,
              title: d.title || 'Untitled Song',
              artist: d.artist || 'Unknown',
              audioUrl: d.audioUrl || '',
              sourceType: d.sourceType || 'url',
              duration: d.duration,
              createdAt: d.createdAt,
            });
          }
        });

        setSavedTracks((prev) => {
          const map = new Map<string, AudioTrack>();
          firestoreTracks.forEach((t) => map.set(t.id, t));
          prev.forEach((t) => {
            if (!map.has(t.id) && !deletedSet.has(t.id)) {
              map.set(t.id, t);
            }
          });
          return Array.from(map.values());
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'tracks');
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsAuthenticatingGoogle(true);
    sound.playClick();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email || '';

      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        sound.playChime();
        onLoginSuccess();
        showToast('Signed in as Administrator! 🛡️');
      } else {
        sound.playPop();
        showToast('This Google account is not authorized for admin access.');
      }
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        showToast(`Domain (${domain}) must be authorized in Firebase Console -> Auth -> Settings.`);
      } else if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        showToast('Popup blocked by browser. Trying redirect sign-in... 🔄');
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          console.warn('Redirect Auth Error:', redirectErr);
          showToast('Redirect sign-in error.');
        }
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        showToast(`Google Auth Error: ${err?.message || 'Login failed'}`);
      }
    } finally {
      setIsAuthenticatingGoogle(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setIsAuthenticatingGoogle(true);
    sound.playClick();
    try {
      showToast('Redirecting to Google Auth... 🔄');
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.warn('Redirect Auth Error:', err);
      showToast(err?.message || 'Redirect login error');
      setIsAuthenticatingGoogle(false);
    }
  };

  // Generic helper to persist settings to Firestore
  const saveGlobalSettingsToFirestore = async (updates: Partial<GlobalSettingsDoc>) => {
    setIsSavingDb(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(
        settingsRef,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      sound.playChime();
      showToast('Saved to database for all visitors! ✨');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
      showToast('Error saving to database. Check internet connection.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleSaveLayout = async (mode: SocialsViewMode) => {
    onSetSocialsViewMode(mode);
    await saveGlobalSettingsToFirestore({ socialsViewMode: mode });
  };

  const handleSaveMotion = async (preset: 'flow' | 'hyper' | 'calm') => {
    onSetMotionPreset(preset);
    await saveGlobalSettingsToFirestore({ motionPreset: preset });
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleanMsg = announceDraft.trim();
    onSetAnnouncement(cleanMsg, announceActiveDraft);
    await saveGlobalSettingsToFirestore({
      announcement: cleanMsg,
      announcementActive: announceActiveDraft,
    });
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleanGame = gameDraft.trim() || 'Watch Dogs 2';
    onSetFavGame(cleanGame);
    await saveGlobalSettingsToFirestore({ favGame: cleanGame });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const cleanNick = nicknameDraft.trim() || 'cursed';
    const cleanBio = bioDraft.trim() || '(˶>⩊<˶)';
    const cleanAvatar = avatarDraft.trim();

    onSetNickname(cleanNick);
    onSetBioEmoticon(cleanBio);
    onSetAvatarUrl(cleanAvatar);

    await saveGlobalSettingsToFirestore({
      nickname: cleanNick,
      bioEmoticon: cleanBio,
      avatarUrl: cleanAvatar,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Pre-fill title from filename without extension
      if (!uploadSongTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setUploadSongTitle(nameWithoutExt);
      }
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = uploadSongTitle.trim();
    const cleanArtist = uploadSongArtist.trim() || 'Unknown Artist';

    if (!cleanTitle) {
      showToast('Please enter a song name 🎵');
      return;
    }

    if (!selectedFile && !uploadSongUrl.trim()) {
      showToast('Please upload an audio file or provide a stream URL 🎧');
      return;
    }

    setIsUploadingTrack(true);
    sound.playClick();

    try {
      let finalAudioUrl = uploadSongUrl.trim();
      let trackId = `track_${Date.now()}`;

      if (selectedFile) {
        if (selectedFile.size > 60 * 1024 * 1024) {
          showToast('Audio file exceeds 60MB limit. Please choose a smaller MP3.');
          setIsUploadingTrack(false);
          return;
        }

        showToast('Syncing track cross-device to Cloud... ⏳');
        setUploadProgress({ percent: 0 });

        // 1. Upload Base64 chunks directly to Firestore so every visitor on any device/URL can stream it
        await uploadAudioChunksToFirestore(trackId, selectedFile, (percent) => {
          setUploadProgress({ percent });
        });

        // 2. Cache in local IndexedDB for instant playback
        await storeAudioBlob(trackId, selectedFile, cleanTitle, cleanArtist).catch(() => {});

        // 3. Set cross-device firestore stream URL
        finalAudioUrl = `firestore://${trackId}`;

        // 4. Background upload to local server
        uploadTrackToServer(selectedFile, cleanTitle, cleanArtist).catch(() => {});

        // Sync with Firestore tracks collection for all clients
        await setDoc(doc(db, 'tracks', trackId), {
          title: cleanTitle.slice(0, 100),
          artist: cleanArtist.slice(0, 100),
          audioUrl: finalAudioUrl,
          sourceType: 'upload',
          duration: 0,
          createdAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, 'tracks'));
      } else {
        // Direct stream URL
        await setDoc(doc(db, 'tracks', trackId), {
          title: cleanTitle.slice(0, 100),
          artist: cleanArtist.slice(0, 100),
          audioUrl: finalAudioUrl,
          sourceType: 'url',
          duration: 0,
          createdAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, 'tracks'));
      }

      // Update active song across all connected clients & devices
      onSetActiveSong(cleanTitle, cleanArtist, finalAudioUrl);
      onSetFavSong(cleanTitle);

      await saveGlobalSettingsToFirestore({
        activeSongId: trackId,
        activeSongTitle: cleanTitle.slice(0, 100),
        activeSongArtist: cleanArtist.slice(0, 100),
        activeSongUrl: finalAudioUrl,
        favSong: cleanTitle.slice(0, 64),
      });

      // Reload tracks list
      await loadTracks();

      sound.playChime();
      showToast(`Added & Activated: ${cleanTitle}! 🎶`);

      // Reset upload inputs
      setUploadSongTitle('');
      setUploadSongArtist('');
      setUploadSongUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Save track error:', err);
      showToast(err.message || 'Failed to save audio track');
    } finally {
      setIsUploadingTrack(false);
      setUploadProgress(null);
    }
  };

  const handleActivateTrack = async (track: AudioTrack) => {
    sound.playClick();
    
    // Stop modal preview if active
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPreviewTrackId(null);

    // Ensure audioUrl is cross-device compatible across real web domains
    let targetUrl = track.audioUrl;
    if (targetUrl.includes('/api/tracks/')) {
      const match = targetUrl.match(/(track_[a-zA-Z0-9_]+)/);
      if (match) {
        targetUrl = `firestore://${match[1]}`;
      }
    }

    onSetActiveSong(track.title, track.artist, targetUrl);
    onSetFavSong(track.title);

    await saveGlobalSettingsToFirestore({
      activeSongId: track.id,
      activeSongTitle: track.title.slice(0, 100),
      activeSongArtist: track.artist.slice(0, 100),
      activeSongUrl: targetUrl,
      favSong: track.title.slice(0, 64),
    });

    showToast(`Broadcasted: ${track.title} 🎵`);
  };

  const handlePreviewTrack = (track: AudioTrack) => {
    sound.playClick();
    const audio = previewAudioRef.current;
    if (!audio) return;

    if (previewTrackId === track.id) {
      audio.pause();
      setPreviewTrackId(null);
    } else {
      audio.src = track.audioUrl;
      audio.currentTime = 0;
      audio.play().then(() => {
        setPreviewTrackId(track.id);
      }).catch((err) => {
        console.warn('Preview playback error:', err);
        showToast('Could not preview audio');
      });
    }
  };

  const handleDeleteTrack = async (track: AudioTrack) => {
    sound.playPop();
    if (previewTrackId === track.id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewTrackId(null);
    }

    try {
      // 1. Permanently delete from local storage, IndexedDB, and server
      await deleteServerTrack(track.id);

      // 2. Delete document from Firestore
      await deleteDoc(doc(db, 'tracks', track.id)).catch(() => {});

      // 3. Immediately purge from local component state
      setSavedTracks((prev) => prev.filter((t) => t.id !== track.id));
      setConfirmDeleteId(null);

      // 4. If the track being deleted was the active broadcast song, clear active song
      if (activeSongTitle === track.title || activeSongUrl === track.audioUrl) {
        onSetActiveSong('', '', '');
        onSetFavSong('');
        await saveGlobalSettingsToFirestore({
          activeSongId: '',
          activeSongTitle: '',
          activeSongArtist: '',
          activeSongUrl: '',
          favSong: '',
        });
      }

      showToast('Track removed from catalog 🗑️');
    } catch (err) {
      console.error('Delete track error:', err);
      showToast('Failed to delete track');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-purple-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0 pr-8">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="truncate">Admin Suite</span>
                  {isAdmin && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      MASTER
                    </span>
                  )}
                </h3>
                <p className="text-[11px] font-mono text-zinc-400 truncate">
                  {isAdmin ? (auth.currentUser?.email || 'Administrator') : 'Google Auth Protected'}
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={async () => {
                  sound.playClick();
                  await signOut(auth).catch(() => {});
                  onLogout();
                  showToast('Logged out of Admin mode');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Log out of Admin Suite"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>

          {!isAdmin ? (
            /* Login Form with Google Auth Only */
            <div className="space-y-4 my-auto py-4">
              <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-4 text-center">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    Sign in with your Google Account to authenticate as Administrator.
                  </p>
                  <p className="text-[10px] font-mono text-purple-300/80 bg-purple-900/30 py-1 px-2.5 rounded-lg inline-block border border-purple-500/20">
                    Active Origin: {typeof window !== 'undefined' ? window.location.hostname : 'cursednul.netlify.app'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isAuthenticatingGoogle}
                  className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 active:scale-98 text-zinc-900 font-semibold text-xs shadow-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
                >
                  {isAuthenticatingGoogle ? (
                    <span className="flex items-center gap-2 text-zinc-700">
                      <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      Authenticating with Google...
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google (Popup)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleRedirectLogin}
                  disabled={isAuthenticatingGoogle}
                  className="w-full py-2.5 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>Alternative: Full-Page Redirect Sign-In</span>
                </button>
              </div>
            </div>
          ) : (
            /* Authenticated Admin Dashboard with 5 Tabs */
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Tab Navigation */}
              <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono">
                {[
                  { id: 'general', label: 'Layout' },
                  { id: 'audio', label: 'Music' },
                  { id: 'profile', label: 'Profile' },
                  { id: 'broadcast', label: 'Banner' },
                  { id: 'moderation', label: 'Mod' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      sound.playClick();
                      setActiveTab(t.id as AdminTab);
                    }}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-purple-600 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Layout & Socials View Style */}
              {activeTab === 'general' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>Socials View Style</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">
                        {socialsViewMode.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Select how your social channels are rendered on your profile.
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleSaveLayout('cards')}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          socialsViewMode === 'cards'
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Rows className="w-4 h-4 text-purple-300" />
                        <span>Cards View</span>
                      </button>

                      <button
                        onClick={() => handleSaveLayout('grid')}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          socialsViewMode === 'grid'
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Grid3X3 className="w-4 h-4 text-purple-300" />
                        <span>Grid View</span>
                      </button>

                      <button
                        onClick={() => handleSaveLayout('dock')}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          socialsViewMode === 'dock'
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4 text-purple-300" />
                        <span>Dock View</span>
                      </button>
                    </div>
                  </div>

                  {/* Motion Engine */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-purple-400" />
                        <span>Background Motion Preset</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300 uppercase">
                        {motionPreset}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                      {[
                        { id: 'calm', label: 'Calm' },
                        { id: 'flow', label: 'Flow' },
                        { id: 'hyper', label: 'Hyper' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleSaveMotion(preset.id as 'flow' | 'hyper' | 'calm')}
                          className={`py-1.5 rounded-lg border transition-all text-center cursor-pointer ${
                            motionPreset === preset.id
                              ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Audio & Music Suite (YouTube Music & MP3 Upload) */}
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  {/* Music Mode Switcher */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setMusicSubTab('ytmusic');
                      }}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        musicSubTab === 'ytmusic'
                          ? 'bg-red-600 text-white font-medium shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Youtube className="w-3.5 h-3.5 text-white" />
                      <span>YouTube Music</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setMusicSubTab('upload');
                      }}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        musicSubTab === 'upload'
                          ? 'bg-purple-600 text-white font-medium shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload MP3 / URL</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: YouTube Music API Search */}
                  {musicSubTab === 'ytmusic' && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Youtube className="w-4 h-4 text-red-400" />
                          <span>Search YouTube Music</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Live API Stream
                        </span>
                      </div>

                      <form onSubmit={handleSearchYt} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Search song, artist or paste YouTube URL..."
                            value={ytQuery}
                            onChange={(e) => setYtQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                          />
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button
                          type="submit"
                          disabled={isSearchingYt}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isSearchingYt ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>Search</span>
                        </button>
                      </form>

                      {/* YouTube Results Grid */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {isSearchingYt ? (
                          <div className="text-center py-6 text-xs font-mono text-zinc-400 animate-pulse">
                            Searching YouTube Music API... 🎵
                          </div>
                        ) : ytResults.length === 0 ? (
                          <div className="text-center py-6 text-xs font-mono text-zinc-500">
                            Type a song name above and tap Search to find YouTube Music tracks.
                          </div>
                        ) : (
                          ytResults.map((item) => {
                            const isSelected = activeSongUrl === item.url || (extractYouTubeVideoId(activeSongUrl) === item.videoId);
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-red-950/40 border-red-500/60 text-white'
                                    : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate text-xs flex items-center gap-1.5">
                                      <span className="truncate">{item.title}</span>
                                      {isSelected && (
                                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                                          LIVE NOW
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                                      {item.artist} · {item.durationStr}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleBroadcastYtTrack(item)}
                                  className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-red-600 hover:bg-red-500 text-white'
                                  }`}
                                  title="Broadcast this YouTube song live"
                                >
                                  <Radio className="w-3 h-3" />
                                  <span>{isSelected ? 'Playing' : 'Play Live'}</span>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: MP3 File Upload */}
                  {musicSubTab === 'upload' && (
                  <form onSubmit={handleSaveTrack} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Music2 className="w-4 h-4 text-pink-400" />
                        <span>Upload MP3 & Set Title</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Upload an MP3 audio file or provide a stream URL, give it a title & artist, and set it as your profile track.
                    </p>

                    {/* Upload MP3 File Button */}
                    <div className="p-3 rounded-xl border border-dashed border-purple-400/30 bg-purple-950/20 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="mp3-file-input"
                      />
                      <label
                        htmlFor="mp3-file-input"
                        className="flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-5 h-5 text-purple-400" />
                        <span className="text-xs font-semibold text-zinc-200">
                          {selectedFile ? selectedFile.name : 'Choose MP3 / Audio File'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {selectedFile
                            ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB loaded`
                            : 'Tap to browse files (.mp3, .wav, .m4a, .ogg)'}
                        </span>
                      </label>
                    </div>

                    {/* Direct Stream URL input */}
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center gap-1">
                        <Link className="w-3.5 h-3.5 text-purple-300" />
                        <span>Direct Stream URL (Recommended for All Devices)</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/audio/mysong.mp3"
                        value={uploadSongUrl}
                        onChange={(e) => setUploadSongUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    {/* Song Title & Artist */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                          Song Title *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Cyberpunk Synthwave"
                          value={uploadSongTitle}
                          onChange={(e) => setUploadSongTitle(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                          Artist Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Nightrunner"
                          value={uploadSongArtist}
                          onChange={(e) => setUploadSongArtist(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingTrack}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUploadingTrack ? 'Uploading track to server...' : 'Upload & Broadcast to Everyone'}</span>
                    </button>

                    {uploadProgress && (
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-purple-200">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping inline-block" />
                            Uploading to server...
                          </span>
                          <span>{uploadProgress.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-200"
                            style={{ width: `${uploadProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </form>
                  )}

                  {/* Hidden preview audio element for testing tracks before broadcast */}
                  <audio ref={previewAudioRef} onEnded={() => setPreviewTrackId(null)} className="hidden" />

                  {/* Saved Tracks Catalog */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                      <span>Music Catalog ({savedTracks.length})</span>
                      <span className="text-[10px] text-zinc-400">Preview or broadcast</span>
                    </div>

                    {savedTracks.length === 0 ? (
                      <div className="text-center py-4 text-xs font-mono text-zinc-500">
                        No custom tracks uploaded yet. Choose an MP3 file above to get started!
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {savedTracks.map((trk) => {
                          const isActive = activeSongTitle === trk.title || activeSongUrl === trk.audioUrl;
                          const isPreviewing = previewTrackId === trk.id;
                          return (
                            <div
                              key={trk.id}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                                isActive
                                  ? 'bg-purple-600/20 border-purple-400/50 text-white'
                                  : 'bg-white/5 border-white/5 text-zinc-300'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold truncate text-xs flex items-center gap-1.5">
                                  <span>{trk.title}</span>
                                  {isActive && (
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      LIVE NOW
                                    </span>
                                  )}
                                  {isPreviewing && !isActive && (
                                    <span className="text-[9px] font-mono text-pink-400 bg-pink-500/20 px-1 rounded">
                                      PREVIEWING
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-400 truncate">
                                  {trk.artist} · {trk.sourceType === 'upload' ? 'MP3 Upload' : 'Stream URL'}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {confirmDeleteId === trk.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTrack(trk)}
                                      className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-400 text-[10px] font-mono cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {/* Preview locally */}
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewTrack(trk)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isPreviewing
                                          ? 'bg-pink-600 text-white'
                                          : 'bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white'
                                      }`}
                                      title={isPreviewing ? 'Stop Preview' : 'Listen Preview'}
                                      aria-label={isPreviewing ? 'Stop Preview' : 'Listen Preview'}
                                    >
                                      {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                    </button>

                                    {/* Broadcast as active song */}
                                    <button
                                      type="button"
                                      onClick={() => handleActivateTrack(trk)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isActive
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white'
                                      }`}
                                      title="Broadcast this song to all visitors"
                                      aria-label="Broadcast this song to all visitors"
                                    >
                                      <Radio className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete track */}
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(trk.id)}
                                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors cursor-pointer"
                                      title="Delete track"
                                      aria-label="Delete track"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Profile & Bio Customizer */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-purple-400" />
                        <span>Profile & Bio Customizer</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Customize your display name, bio mood emoticon, favorite game, and avatar image.
                    </p>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Display Nickname
                      </label>
                      <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        placeholder="cursed"
                        maxLength={24}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Bio Mood / Emoticon
                      </label>
                      <input
                        type="text"
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="(˶>⩊<˶)"
                        maxLength={32}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Favorite Game Title
                      </label>
                      <input
                        type="text"
                        value={gameDraft}
                        onChange={(e) => {
                          setGameDraft(e.target.value);
                          onSetFavGame(e.target.value);
                        }}
                        placeholder="e.g. Watch Dogs 2"
                        maxLength={64}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Custom Avatar Image URL
                      </label>
                      <input
                        type="url"
                        value={avatarDraft}
                        onChange={(e) => setAvatarDraft(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        maxLength={512}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingDb}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingDb ? 'Saving...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 5: Live Broadcast Banner */}
              {activeTab === 'broadcast' && (
                <form onSubmit={handleSaveAnnouncement} className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4 text-purple-400" />
                        <span>Live Marquee Announcement</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] font-mono text-zinc-400">
                          {announceActiveDraft ? 'ACTIVE' : 'OFF'}
                        </span>
                        <input
                          type="checkbox"
                          checked={announceActiveDraft}
                          onChange={(e) => setAnnounceActiveDraft(e.target.checked)}
                          className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Display a glowing marquee banner across the top of your site for all visitors.
                    </p>

                    <input
                      type="text"
                      placeholder="e.g. Streaming tonight on YouTube! · Join Discord VC"
                      value={announceDraft}
                      onChange={(e) => setAnnounceDraft(e.target.value)}
                      maxLength={180}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />

                    <button
                      type="submit"
                      disabled={isSavingDb}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingDb ? 'Publishing...' : 'Publish Banner'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 6: Moderation & Comment Tools */}
              {activeTab === 'moderation' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span>Comments Moderation & Backup</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {commentCount} saved
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Export a JSON backup of community comments or clear the database.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          onExportComments();
                        }}
                        className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-300" />
                        <span>Export Backup</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playPop();
                          if (window.confirm('Delete all comments permanently?')) {
                            onClearAllComments();
                            showToast('All comments cleared');
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Purge All</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Log Out Button */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                <span className="text-[11px] font-mono text-zinc-500">
                  ADMIN SESSION ACTIVE
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onLogout();
                    showToast('Logged out of admin mode');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
