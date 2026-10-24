import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
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
  User,
  Save,
  Check,
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
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SocialsViewMode, AudioTrack, GlobalSettingsDoc } from '../types';
import { sound } from '../utils/audio';
import { storeAudioBlob, calculateAudioDuration, getStoredAudioUrl } from '../utils/audioStorage';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
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

const _AUTH_HASH = 'Mmd2aVQ0Xw=='; // '2gviT4_'

function verifyPasscode(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();
  try {
    return btoa(clean) === _AUTH_HASH;
  } catch {
    return false;
  }
}

type AdminTab = 'general' | 'audio' | 'profile' | 'broadcast' | 'moderation';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginSuccess,
  onLogout,
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
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('general');
  const [isSavingDb, setIsSavingDb] = useState(false);

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

  // Sync draft states when modal opens
  useEffect(() => {
    if (isOpen) {
      setGameDraft(favGame);
      setSongDraft(favSong);
      setAnnounceDraft(announcement);
      setAnnounceActiveDraft(announcementActive);
      setNicknameDraft(nickname);
      setBioDraft(bioEmoticon);
      setAvatarDraft(avatarUrl);
    }
  }, [isOpen, favGame, favSong, announcement, announcementActive, nickname, bioEmoticon, avatarUrl]);

  // Subscribe to Tracks in Firestore
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'tracks'), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tracks: AudioTrack[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          tracks.push({
            id: docSnap.id,
            title: d.title || 'Untitled Song',
            artist: d.artist || 'Unknown',
            audioUrl: d.audioUrl || '',
            sourceType: d.sourceType || 'url',
            duration: d.duration,
            createdAt: d.createdAt,
          });
        });
        setSavedTracks(tracks);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'tracks');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPasscode(password)) {
      sound.playChime();
      setError(false);
      setPassword('');
      onLoginSuccess();
      showToast('Admin suite unlocked! 🛡️');
    } else {
      sound.playPop();
      setError(true);
      showToast('Invalid passcode');
      setTimeout(() => setError(false), 2000);
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
      showToast('Please upload an MP3 file or provide an audio URL 🎧');
      return;
    }

    setIsUploadingTrack(true);
    sound.playClick();

    try {
      let finalAudioUrl = uploadSongUrl.trim();
      let firestoreAudioUrl = uploadSongUrl.trim();
      let duration = 0;
      let sourceType: 'upload' | 'url' = 'url';

      if (selectedFile) {
        sourceType = 'upload';
        duration = await calculateAudioDuration(selectedFile);
        const trackId = `track_${Date.now()}`;
        // Store in IndexedDB
        finalAudioUrl = await storeAudioBlob(trackId, selectedFile, cleanTitle, cleanArtist);
        // Use trackId for Firestore reference so URLs are never truncated
        firestoreAudioUrl = trackId;
      }

      // Add to Firestore tracks collection
      await addDoc(collection(db, 'tracks'), {
        title: cleanTitle.slice(0, 100),
        artist: cleanArtist.slice(0, 100),
        audioUrl: firestoreAudioUrl,
        sourceType,
        duration,
        createdAt: new Date().toISOString(),
      });

      // Update active song locally and in Firestore global settings
      onSetActiveSong(cleanTitle, cleanArtist, finalAudioUrl);
      onSetFavSong(cleanTitle);

      await saveGlobalSettingsToFirestore({
        activeSongTitle: cleanTitle.slice(0, 100),
        activeSongArtist: cleanArtist.slice(0, 100),
        activeSongUrl: firestoreAudioUrl,
        favSong: cleanTitle.slice(0, 64),
      });

      sound.playChime();
      showToast(`Added & Activated: ${cleanTitle}! 🎶`);

      // Reset upload inputs
      setUploadSongTitle('');
      setUploadSongArtist('');
      setUploadSongUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tracks');
      showToast('Failed to save audio track');
    } finally {
      setIsUploadingTrack(false);
    }
  };

  const handleActivateTrack = async (track: AudioTrack) => {
    sound.playClick();
    const resolvedUrl = (await getStoredAudioUrl(track.audioUrl)) || track.audioUrl;
    onSetActiveSong(track.title, track.artist, resolvedUrl);
    onSetFavSong(track.title);

    await saveGlobalSettingsToFirestore({
      activeSongTitle: track.title.slice(0, 100),
      activeSongArtist: track.artist.slice(0, 100),
      activeSongUrl: track.audioUrl,
      favSong: track.title.slice(0, 64),
    });

    showToast(`Now playing: ${track.title} 🎵`);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm('Delete this track from database?')) return;
    sound.playPop();
    try {
      await deleteDoc(doc(db, 'tracks', trackId));
      showToast('Track deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tracks/${trackId}`);
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
          <div className="flex items-center gap-2.5 mb-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Admin Suite & Customizer</span>
                {isAdmin && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    MASTER CONFIG
                  </span>
                )}
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                {isAdmin ? 'Master profile settings' : 'Passcode Protected'}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4 my-auto py-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter administrator passcode to configure socials layout, upload songs, customize games, and manage live site settings.
              </p>

              <div>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3" />
                  <input
                    type="password"
                    placeholder="Enter passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                    className={`w-full pl-9 pr-3.5 py-3 rounded-xl bg-black/40 border text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono ${
                      error
                        ? 'border-rose-500 text-rose-300 animate-pulse'
                        : 'border-white/15 focus:border-purple-400'
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-rose-400 font-mono mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Incorrect passcode
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Authenticate & Unlock
              </button>
            </form>
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

              {/* TAB 2: Audio & MP3 Upload Suite */}
              {activeTab === 'audio' && (
                <div className="space-y-4">
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

                    {/* Or URL input */}
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center gap-1">
                        <Link className="w-3.5 h-3.5 text-purple-300" />
                        <span>Or Direct MP3 Stream URL</span>
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
                          placeholder="e.g. L'amour Toujours"
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
                          placeholder="e.g. Gigi D'Agostino"
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
                      <span>{isUploadingTrack ? 'Saving track...' : 'Save & Set Active Track'}</span>
                    </button>
                  </form>

                  {/* Saved Tracks Catalog */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                      <span>Saved Tracks ({savedTracks.length})</span>
                      <span className="text-[10px] text-zinc-400">Click Play to activate</span>
                    </div>

                    {savedTracks.length === 0 ? (
                      <div className="text-center py-4 text-xs font-mono text-zinc-500">
                        Default track active (L'amour Toujours). Upload your custom track above!
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {savedTracks.map((trk) => {
                          const isActive = activeSongTitle === trk.title;
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
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1 rounded">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-400 truncate">
                                  {trk.artist} · {trk.sourceType}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleActivateTrack(trk)}
                                  className="p-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white transition-colors cursor-pointer"
                                  title="Activate this song"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrack(trk.id)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors cursor-pointer"
                                  title="Delete track"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
