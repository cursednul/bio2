import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, MessageSquare, ShieldCheck, Megaphone } from 'lucide-react';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { ProfileCard } from './components/ProfileCard';
import { SocialLinks } from './components/SocialLinks';
import { Comments } from './components/Comments';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AdminModal } from './components/AdminModal';
import { Toast } from './components/Toast';
import { ThemeConfig } from './types';
import { sound } from './utils/audio';

// Signature Phantom Lavender Theme
const SIGNATURE_THEME: ThemeConfig = {
  id: 'lavender',
  name: 'Phantom Lavender',
  primary: '#9b6dff',
  primaryLight: '#d7a7ff',
  glow: 'rgba(155, 109, 255, 0.22)',
  bgDark: '#0b0816',
  cardBg: 'rgba(255, 255, 255, 0.035)',
  cardBorder: 'rgba(183, 142, 255, 0.2)',
  accent: '#b58aff',
  textGradient:
    'linear-gradient(110deg, #a79bff 0%, #d9d0ff 20%, #ffffff 35%, #a99aff 48%, #f0eaff 58%, #8b7cff 76%, #ded6ff 88%, #a79bff 100%)',
};

type ActiveTab = 'socials' | 'comments';

export default function App() {
  const theme = SIGNATURE_THEME;
  const [activeTab, setActiveTab] = useState<ActiveTab>('socials');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cursed_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Global Socials View Mode (Controlled only by Admin, applies to all visitors)
  const [socialsViewMode, setSocialsViewMode] = useState<'cards' | 'dock'>(() => {
    try {
      const saved = localStorage.getItem('cursed_socials_view_mode');
      if (saved === 'dock' || saved === 'cards') return saved;
    } catch {
      // Ignore
    }
    return 'cards';
  });

  // Live Customizable Favorite Game & Song (Configured by Admin)
  const [favGame, setFavGame] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cursed_fav_game');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return 'Watch Dogs 2';
  });

  const [favSong, setFavSong] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cursed_fav_song');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return "L'amour Toujours";
  });

  // Live Broadcast Announcement Banner (Configured by Admin)
  const [announcement, setAnnouncement] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('cursed_announcement');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return 'Welcome to cursed · Connect on Telegram, TikTok & Discord';
  });

  const [announcementActive, setAnnouncementActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cursed_announcement_active') === 'true';
    } catch {
      return false;
    }
  });

  // Background Motion Engine Preset
  const [motionPreset, setMotionPreset] = useState<'flow' | 'hyper' | 'calm'>(() => {
    try {
      const saved = localStorage.getItem('cursed_motion_preset');
      if (saved === 'calm' || saved === 'hyper' || saved === 'flow') return saved;
    } catch {
      // Ignore
    }
    return 'flow';
  });

  const motionScale = motionPreset === 'calm' ? 0.4 : motionPreset === 'hyper' ? 1.6 : 1.0;

  // Secret 10-Click Admin Trigger on star icon
  const [starClicks, setStarClicks] = useState(0);
  const starTimerRef = useRef<number | null>(null);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdmin) {
      sound.playClick();
      setIsAdminModalOpen(true);
      return;
    }

    sound.playClick(1.3);
    setStarClicks((prev) => {
      const next = prev + 1;
      if (next >= 10) {
        sound.playChime();
        setIsAdminModalOpen(true);
        return 0;
      }
      return next;
    });

    if (starTimerRef.current) clearTimeout(starTimerRef.current);
    starTimerRef.current = window.setTimeout(() => {
      setStarClicks(0);
    }, 4000);
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem('cursed_admin_auth', 'true');
    } catch {
      // Ignore
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('cursed_admin_auth');
    } catch {
      // Ignore
    }
  };

  const handleUpdateSocialsViewMode = (mode: 'cards' | 'dock') => {
    setSocialsViewMode(mode);
    try {
      localStorage.setItem('cursed_socials_view_mode', mode);
    } catch {
      // Ignore
    }
  };

  const handleUpdateFavGame = (game: string) => {
    setFavGame(game);
    try {
      localStorage.setItem('cursed_fav_game', game);
    } catch {
      // Ignore
    }
  };

  const handleUpdateFavSong = (song: string) => {
    setFavSong(song);
    try {
      localStorage.setItem('cursed_fav_song', song);
    } catch {
      // Ignore
    }
  };

  const handleUpdateAnnouncement = (msg: string, active: boolean) => {
    setAnnouncement(msg);
    setAnnouncementActive(active);
    try {
      localStorage.setItem('cursed_announcement', msg);
      localStorage.setItem('cursed_announcement_active', active ? 'true' : 'false');
    } catch {
      // Ignore
    }
  };

  const handleUpdateMotionPreset = (preset: 'flow' | 'hyper' | 'calm') => {
    setMotionPreset(preset);
    try {
      localStorage.setItem('cursed_motion_preset', preset);
    } catch {
      // Ignore
    }
  };

  const [commentResetKey, setCommentResetKey] = useState(0);
  const handleClearAllComments = () => {
    try {
      localStorage.removeItem('cursed_saved_comments');
    } catch {
      // Ignore
    }
    setCommentResetKey((k) => k + 1);
  };

  const handleExportComments = () => {
    try {
      const data = localStorage.getItem('cursed_saved_comments') || '[]';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cursed_comments_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Comments backup downloaded! 📁');
    } catch {
      showToast('Unable to export comments');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  const handleShare = async () => {
    sound.playClick();
    const shareData = {
      title: 'cursed — Profile',
      text: 'Explore cursed on Telegram, TikTok, Instagram, Discord & Steam',
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Profile link copied to clipboard! ✨');
      } catch {
        showToast('Share: ' + window.location.href);
      }
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'socials', label: 'Socials', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="min-h-screen text-zinc-100 relative selection:bg-purple-500/30 selection:text-white transition-colors duration-700 pb-36 sm:pb-32"
      style={{ backgroundColor: theme.bgDark }}
    >
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Interactive Background Kinetic Canvas */}
      <BackgroundCanvas theme={theme} motionScale={motionScale} />

      {/* Admin Live Announcement Banner */}
      {announcementActive && announcement.trim() && (
        <div className="relative z-40 w-full bg-purple-950/80 border-b border-purple-500/30 px-3 py-2 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs text-purple-200 text-center font-medium">
            <Megaphone className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-bounce" />
            <span className="truncate">{announcement}</span>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="relative z-30 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4 sm:gap-6 border-b border-white/5">
        {/* Zone 1: Single text element wordmark with 10-click secret trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              sound.playChime();
              setActiveTab('socials');
            }}
            className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 group flex items-center gap-1.5"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <span
              onClick={handleStarClick}
              className="text-purple-400 group-hover:rotate-12 transition-transform inline-block cursor-pointer select-none p-1 -m-1"
              title={isAdmin ? 'Admin Control Suite' : ''}
            >
              ✦
            </span>
            <span>cursed</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-2 py-0.5 min-h-[28px] rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1 cursor-pointer shadow-sm hover:bg-emerald-900/60 transition-colors"
              title="Open Admin Suite"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>ADMIN</span>
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links (Clean 2 Tabs) */}
        <nav className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id);
                }}
                className={`relative px-4 py-2 min-h-[40px] rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-purple-600/80 shadow-md border border-purple-400/30"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Header Action */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin ? (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 text-xs font-medium transition-all cursor-pointer shadow-md"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Suite</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-zinc-500 select-none hidden sm:block">
              (˶&gt;⩊&lt;˶)
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 max-w-4xl mx-auto px-4 pt-6 sm:pt-8 flex flex-col items-center">
        {/* Central 3D Interactive Profile Card */}
        <ProfileCard
          theme={theme}
          onShare={handleShare}
          showToast={showToast}
          favGame={favGame}
          favSong={favSong}
        />

        {/* Dynamic Tab Body */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'socials' && (
              <motion.div
                key="socials"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <SocialLinks
                  theme={theme}
                  viewMode={socialsViewMode}
                  isAdmin={isAdmin}
                  onSetViewMode={handleUpdateSocialsViewMode}
                  showToast={showToast}
                />
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div
                key={`comments-${commentResetKey}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <Comments
                  theme={theme}
                  isAdmin={isAdmin}
                  onOpenAdmin={() => setIsAdminModalOpen(true)}
                  showToast={showToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Audio Synthesizer Bar with Volume Changer */}
      <AudioPlayerBar theme={theme} showToast={showToast} />

      {/* Secret Admin Control Suite */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLoginSuccess={handleAdminLogin}
        onLogout={handleAdminLogout}
        socialsViewMode={socialsViewMode}
        onSetSocialsViewMode={handleUpdateSocialsViewMode}
        favGame={favGame}
        onSetFavGame={handleUpdateFavGame}
        favSong={favSong}
        onSetFavSong={handleUpdateFavSong}
        announcement={announcement}
        announcementActive={announcementActive}
        onSetAnnouncement={handleUpdateAnnouncement}
        motionPreset={motionPreset}
        onSetMotionPreset={handleUpdateMotionPreset}
        onClearAllComments={handleClearAllComments}
        commentCount={0}
        onExportComments={handleExportComments}
        showToast={showToast}
      />
    </div>
  );
}
