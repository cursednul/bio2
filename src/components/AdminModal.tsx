import React, { useState } from 'react';
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
  Gauge,
  Download,
  Terminal,
  Sparkles,
  Layers,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
  // Admin Features
  socialsViewMode: 'cards' | 'dock';
  onSetSocialsViewMode: (mode: 'cards' | 'dock') => void;
  favGame: string;
  onSetFavGame: (game: string) => void;
  favSong: string;
  onSetFavSong: (song: string) => void;
  announcement: string;
  announcementActive: boolean;
  onSetAnnouncement: (msg: string, active: boolean) => void;
  motionPreset: 'flow' | 'hyper' | 'calm';
  onSetMotionPreset: (preset: 'flow' | 'hyper' | 'calm') => void;
  onClearAllComments: () => void;
  commentCount: number;
  onExportComments: () => void;
  showToast: (msg: string) => void;
}

// Obfuscated Base64 credential hash for '2gviT4_'
const _AUTH_HASH = 'Mmd2aVQ0Xw==';

function verifyPasscode(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();
  try {
    return btoa(clean) === _AUTH_HASH;
  } catch {
    return false;
  }
}

type AdminTab = 'general' | 'broadcast' | 'status' | 'moderation';

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
  onClearAllComments,
  commentCount,
  onExportComments,
  showToast,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('general');

  // Local draft states
  const [gameDraft, setGameDraft] = useState(favGame);
  const [songDraft, setSongDraft] = useState(favSong);
  const [announceDraft, setAnnounceDraft] = useState(announcement);
  const [announceActiveDraft, setAnnounceActiveDraft] = useState(announcementActive);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPasscode(password)) {
      sound.playChime();
      setError(false);
      setPassword('');
      onLoginSuccess();
      showToast('Admin mode activated 🛡️');
    } else {
      sound.playPop();
      setError(true);
      showToast('Invalid admin passcode');
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    onSetFavGame(gameDraft.trim() || 'Watch Dogs 2');
    onSetFavSong(songDraft.trim() || "L'amour Toujours");
    showToast('Profile status updated for all visitors ✨');
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    onSetAnnouncement(announceDraft.trim(), announceActiveDraft);
    showToast(
      announceActiveDraft
        ? 'Announcement banner published live 📢'
        : 'Announcement hidden'
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-purple-500/30 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
          <div className="flex items-center gap-2.5 mb-4 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Admin Control Suite</span>
                {isAdmin && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MASTER
                  </span>
                )}
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                {isAdmin ? 'Full Site Administration Unlocked' : 'Passcode Protected'}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4 my-auto">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter your administrator passcode to access live moderation, global layout overrides, and site features.
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
                Authenticate
              </button>
            </form>
          ) : (
            /* Authenticated Admin Dashboard with Tabs */
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Tab Navigation */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono">
                {[
                  { id: 'general', label: 'Layout' },
                  { id: 'broadcast', label: 'Broadcast' },
                  { id: 'status', label: 'Favs' },
                  { id: 'moderation', label: 'Moderate' },
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

              {/* Tab 1: Layout & Socials View Controller */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>Global Socials Layout</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">
                        Applies to all visitors
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Choose how your social channels are rendered for everyone who visits the site.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          sound.playClick();
                          onSetSocialsViewMode('cards');
                          showToast('Socials set to Cards View for all visitors');
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          socialsViewMode === 'cards'
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Rows className="w-4 h-4 text-purple-300" />
                        <span>Cards View</span>
                      </button>

                      <button
                        onClick={() => {
                          sound.playClick();
                          onSetSocialsViewMode('dock');
                          showToast('Socials set to Dock View for all visitors');
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
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

                  {/* Motion FX Engine Preset */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-purple-400" />
                        <span>Background Motion Engine</span>
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
                          onClick={() => {
                            sound.playClick();
                            onSetMotionPreset(preset.id as 'flow' | 'hyper' | 'calm');
                            showToast(`Motion preset: ${preset.label}`);
                          }}
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

              {/* Tab 2: Broadcast Announcement Banner */}
              {activeTab === 'broadcast' && (
                <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4 text-purple-400" />
                        <span>Live Broadcast Banner</span>
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
                      Display a glowing marquee banner at the top of your site for all visitors.
                    </p>

                    <input
                      type="text"
                      placeholder="e.g. Streaming CS2 tonight on YouTube! · Join Discord VC"
                      value={announceDraft}
                      onChange={(e) => setAnnounceDraft(e.target.value)}
                      maxLength={120}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />

                    <button
                      type="submit"
                      className="w-full py-2.5 min-h-[44px] rounded-xl bg-purple-600 active:bg-purple-700 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                    >
                      Save & Publish Broadcast
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Favorite Game & Song Status Strip Customizer */}
              {activeTab === 'status' && (
                <form onSubmit={handleSaveStatus} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Card Status Strip Customizer</span>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Customize the favorite game and favorite song displayed in the profile footer.
                    </p>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center gap-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Favorite Game</span>
                      </label>
                      <input
                        type="text"
                        value={gameDraft}
                        onChange={(e) => setGameDraft(e.target.value)}
                        placeholder="e.g. Watch Dogs 2"
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1 flex items-center gap-1">
                        <Music2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>Favorite Song</span>
                      </label>
                      <input
                        type="text"
                        value={songDraft}
                        onChange={(e) => setSongDraft(e.target.value)}
                        placeholder="e.g. L'amour Toujours"
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 min-h-[44px] rounded-xl bg-purple-600 active:bg-purple-700 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                    >
                      Update Profile Status
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 4: Moderation & Comment Tools */}
              {activeTab === 'moderation' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
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
                  SESSION ACTIVE
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
