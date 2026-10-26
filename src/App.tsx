import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, MessageSquare, ShieldCheck, Megaphone, Gamepad2, Plus } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth, signOut, onAuthStateChanged, getRedirectResult, handleFirestoreError, OperationType } from './firebase';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { ProfileCard } from './components/ProfileCard';
import { SocialLinks } from './components/SocialLinks';
import { Comments } from './components/Comments';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AdminModal, AdminTab } from './components/AdminModal';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeConfig, SocialsViewMode, GlobalSettingsDoc } from './types';
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
  const [adminModalInitialTab, setAdminModalInitialTab] = useState<AdminTab>('audio');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [commentResetKey, setCommentResetKey] = useState(0);

  // Admin session authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('cursed_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Global Socials View Mode - Live synced with Firestore
  const [socialsViewMode, setSocialsViewMode] = useState<SocialsViewMode>(() => {
    try {
      const saved = localStorage.getItem('cursed_socials_view_mode') as SocialsViewMode;
      if (saved === 'dock' || saved === 'cards' || saved === 'grid') return saved;
    } catch {
      // Ignore
    }
    return 'cards';
  });

  // Live Customizable Favorite Game & Song
  const [favGame, setFavGame] = useState<string>('Watch Dogs 2');
  const [favSong, setFavSong] = useState<string>('Cyberpunk Synthwave');

  // Live Audio Player Song Details
  const [activeSongTitle, setActiveSongTitle] = useState<string>('');
  const [activeSongArtist, setActiveSongArtist] = useState<string>('');
  const [activeSongUrl, setActiveSongUrl] = useState<string>('');

  // Profile Customization
  const [nickname, setNickname] = useState<string>('cursed');
  const [bioEmoticon, setBioEmoticon] = useState<string>('(˶>⩊<˶)');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Live Broadcast Announcement Banner
  const [announcement, setAnnouncement] = useState<string>(
    'Welcome to cursed · Connect on Telegram, TikTok & Discord'
  );
  const [announcementActive, setAnnouncementActive] = useState<boolean>(false);

  // Background Motion Engine Preset
  const [motionPreset, setMotionPreset] = useState<'flow' | 'hyper' | 'calm'>('flow');

  // Secret 10-Click Admin Trigger on star icon
  const [starClicks, setStarClicks] = useState(0);
  const starTimerRef = useRef<number | null>(null);

  // Real-time synchronization of Global Settings from Firestore (Database Persistence)
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<GlobalSettingsDoc>;
          if (data.socialsViewMode) setSocialsViewMode(data.socialsViewMode);
          if (data.favGame) setFavGame(data.favGame);
          if (data.favSong) setFavSong(data.favSong);
          if (data.announcement !== undefined) setAnnouncement(data.announcement);
          if (data.announcementActive !== undefined) setAnnouncementActive(data.announcementActive);
          if (data.motionPreset) setMotionPreset(data.motionPreset);
          if (data.nickname) setNickname(data.nickname);
          if (data.bioEmoticon) setBioEmoticon(data.bioEmoticon);
          if (data.avatarUrl !== undefined) setAvatarUrl(data.avatarUrl);
          if (data.activeSongTitle !== undefined) setActiveSongTitle(data.activeSongTitle);
          if (data.activeSongArtist !== undefined) setActiveSongArtist(data.activeSongArtist);
          if (data.activeSongUrl !== undefined) setActiveSongUrl(data.activeSongUrl);
        } else {
          // Initialize default document in Firestore if not present yet
          setDoc(
            settingsRef,
            {
              socialsViewMode: 'cards',
              favGame: 'Watch Dogs 2',
              favSong: '',
              announcement: 'Welcome to cursed · Connect on Telegram, TikTok & Discord',
              announcementActive: false,
              motionPreset: 'flow',
              nickname: 'cursed',
              bioEmoticon: '(˶>⩊<˶)',
              avatarUrl: '',
              activeSongTitle: '',
              activeSongArtist: '',
              activeSongUrl: '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch((e) => handleFirestoreError(e, OperationType.CREATE, 'settings/global'));
        }
        setIsReady(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/global');
        setIsReady(true); // Proceed even if load fails to prevent infinite hang
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen for Google Authentication state & redirect results
  useEffect(() => {
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user?.email && res.user.email.toLowerCase() === 'kirya2010777@gmail.com') {
          setIsAdmin(true);
          try {
            sessionStorage.setItem('cursed_admin_auth', 'true');
          } catch {
            // Ignore
          }
          setToastMessage('Signed in as Administrator! 🛡️');
        }
      })
      .catch((err) => {
        console.warn('Redirect Auth Error:', err);
      });

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email && user.email.toLowerCase() === 'kirya2010777@gmail.com') {
        setIsAdmin(true);
        try {
          sessionStorage.setItem('cursed_admin_auth', 'true');
        } catch {
          // Ignore
        }
      }
    });
    return () => unsub();
  }, []);

  const motionScale = motionPreset === 'calm' ? 0.4 : motionPreset === 'hyper' ? 1.6 : 1.0;

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

  const handleAdminLogout = async () => {
    setIsAdmin(false);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    try {
      sessionStorage.removeItem('cursed_admin_auth');
    } catch {
      // Ignore
    }
  };

  // Immediate database sync for Socials View Mode
  const handleUpdateSocialsViewMode = async (mode: SocialsViewMode) => {
    setSocialsViewMode(mode);
    try {
      localStorage.setItem('cursed_socials_view_mode', mode);
      await setDoc(
        doc(db, 'settings', 'global'),
        {
          socialsViewMode: mode,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast(`Socials view style updated to ${mode.toUpperCase()}! ✨`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleSetActiveSong = (title: string, artist: string, url: string) => {
    setActiveSongTitle(title);
    setActiveSongArtist(artist);
    setActiveSongUrl(url);
    setFavSong(title);
  };

  const handleClearAllComments = () => {
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
      title: `${nickname} — Profile`,
      text: `Explore ${nickname} on Telegram, TikTok, Instagram, Discord & Steam`,
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
      className="min-h-screen text-zinc-100 relative selection:bg-purple-500/30 selection:text-white transition-colors duration-700 pb-[calc(7.5rem+env(safe-area-inset-bottom,12px))] overflow-x-hidden"
      style={{ backgroundColor: theme.bgDark }}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {!isReady && <LoadingScreen key="app-loading-screen" />}
      </AnimatePresence>

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
      <header className="relative z-30 w-full max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-6 border-b border-white/5">
        {/* Zone 1: Wordmark with 10-click secret trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              sound.playChime();
              setActiveTab('socials');
            }}
            className="text-base sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 group flex items-center gap-1 sm:gap-1.5"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <span
              onClick={handleStarClick}
              className="text-purple-400 group-hover:rotate-12 transition-transform inline-block cursor-pointer select-none p-1 -m-1"
              title={isAdmin ? 'Admin Control Suite' : ''}
            >
              ✦
            </span>
            <span>{nickname}</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => {
                sound.playClick();
                setAdminModalInitialTab('general');
                setIsAdminModalOpen(true);
              }}
              className="px-1.5 sm:px-2 py-0.5 min-h-[24px] sm:min-h-[28px] rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[9px] sm:text-[10px] font-mono text-emerald-300 flex items-center gap-1 cursor-pointer shadow-sm hover:bg-emerald-900/60 transition-colors"
              title="Open Admin Suite"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>ADMIN</span>
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links (Clean 2 Tabs) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id);
                }}
                className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer touch-manipulation ${
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
                <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 text-xs font-medium transition-all cursor-pointer shadow-md"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Suite</span>
            </button>
          ) : (
            <div className="text-[11px] font-mono text-zinc-500 select-none hidden sm:block">
              {bioEmoticon}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 w-full max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-8 flex flex-col items-center">
        {/* Central 3D Interactive Profile Card */}
        <ProfileCard
          theme={theme}
          onShare={handleShare}
          showToast={showToast}
          favGame={favGame}
          favSong={activeSongTitle || favSong}
          nickname={nickname}
          bioEmoticon={bioEmoticon}
          avatarUrl={avatarUrl}
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

      {/* Floating Audio Synthesizer Bar with Volume & Dynamic Track Support */}
      <AudioPlayerBar
        theme={theme}
        showToast={showToast}
        activeSongTitle={activeSongTitle}
        activeSongArtist={activeSongArtist}
        activeSongUrl={activeSongUrl}
        onOpenUpload={
          isAdmin
            ? () => {
                sound.playClick();
                setAdminModalInitialTab('audio');
                setIsAdminModalOpen(true);
              }
            : undefined
        }
      />

      {/* Secret Admin Control Suite */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdmin={isAdmin}
        onLoginSuccess={handleAdminLogin}
        onLogout={handleAdminLogout}
        initialTab={adminModalInitialTab}
        socialsViewMode={socialsViewMode}
        onSetSocialsViewMode={handleUpdateSocialsViewMode}
        favGame={favGame}
        onSetFavGame={setFavGame}
        favSong={favSong}
        onSetFavSong={setFavSong}
        announcement={announcement}
        announcementActive={announcementActive}
        onSetAnnouncement={(msg, active) => {
          setAnnouncement(msg);
          setAnnouncementActive(active);
        }}
        motionPreset={motionPreset}
        onSetMotionPreset={setMotionPreset}
        nickname={nickname}
        onSetNickname={setNickname}
        bioEmoticon={bioEmoticon}
        onSetBioEmoticon={setBioEmoticon}
        avatarUrl={avatarUrl}
        onSetAvatarUrl={setAvatarUrl}
        activeSongTitle={activeSongTitle}
        activeSongArtist={activeSongArtist}
        activeSongUrl={activeSongUrl}
        onSetActiveSong={handleSetActiveSong}
        onClearAllComments={handleClearAllComments}
        commentCount={0}
        onExportComments={handleExportComments}
        showToast={showToast}
      />
    </div>
  );
}
