import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, Volume1, VolumeX, Disc3, Music2, Plus } from 'lucide-react';
import { ThemeConfig } from '../types';
import { sound } from '../utils/audio';
import { getStoredAudioUrl } from '../utils/audioStorage';

interface AudioPlayerBarProps {
  theme: ThemeConfig;
  showToast: (msg: string) => void;
  activeSongTitle?: string;
  activeSongArtist?: string;
  activeSongUrl?: string;
  onOpenUpload?: () => void;
}

const DEFAULT_AUDIO_SRC = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/assets/aistudio/Gigi_D_agostino_-_L_amour_Toujours__Tanzen_Vision_Rmx__6f45e248.mp3`;

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  theme,
  showToast,
  activeSongTitle = "L'amour Toujours",
  activeSongArtist = "Gigi D'Agostino",
  activeSongUrl,
  onOpenUpload,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string>(DEFAULT_AUDIO_SRC);

  // Volume state
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cursed_audio_volume');
      if (saved !== null) {
        const v = parseFloat(saved);
        if (!isNaN(v) && v >= 0 && v <= 1) return v;
      }
    } catch {
      // Ignore
    }
    return 0.8;
  });

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Resolve activeSongUrl asynchronously (handles IndexedDB track IDs, data URLs, direct links)
  useEffect(() => {
    let isMounted = true;
    async function resolveSrc() {
      if (!activeSongUrl || !activeSongUrl.trim()) {
        if (isMounted) setResolvedAudioSrc(DEFAULT_AUDIO_SRC);
        return;
      }
      try {
        const resolved = await getStoredAudioUrl(activeSongUrl);
        if (isMounted) {
          setResolvedAudioSrc(resolved || DEFAULT_AUDIO_SRC);
        }
      } catch {
        if (isMounted) setResolvedAudioSrc(DEFAULT_AUDIO_SRC);
      }
    }
    resolveSrc();
    return () => {
      isMounted = false;
    };
  }, [activeSongUrl]);

  // When resolved track source changes, update audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = resolvedAudioSrc;
    audio.load();
    setCurrentTime(0);

    if (isPlaying) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error on track change:', err);
          setIsPlaying(false);
          // If custom track failed, fallback to default
          if (resolvedAudioSrc !== DEFAULT_AUDIO_SRC) {
            setResolvedAudioSrc(DEFAULT_AUDIO_SRC);
            showToast('Unable to stream custom track. Playing default 🎵');
          }
        });
    }
  }, [resolvedAudioSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, isMuted]);

  const handleAudioError = () => {
    if (resolvedAudioSrc !== DEFAULT_AUDIO_SRC) {
      setResolvedAudioSrc(DEFAULT_AUDIO_SRC);
      showToast('Track URL unreachable. Default track loaded 🎵');
    }
  };

  const togglePlay = async () => {
    sound.playClick();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      showToast(`Paused ${activeSongTitle}`);
    } else {
      try {
        if (audio.readyState === 0) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
        showToast(`Playing ${activeSongTitle} 🎵`);
      } catch (err) {
        console.warn('Playback failed:', err);
        // Attempt fallback to default audio track if custom track fails
        if (resolvedAudioSrc !== DEFAULT_AUDIO_SRC) {
          setResolvedAudioSrc(DEFAULT_AUDIO_SRC);
          showToast('Custom MP3 link unreachable. Playing default song 🎵');
          try {
            audio.src = DEFAULT_AUDIO_SRC;
            audio.load();
            await audio.play();
            setIsPlaying(true);
          } catch {
            setIsPlaying(false);
          }
        } else {
          showToast('Click play again to start audio');
        }
      }
    }
  };

  const toggleMuteOrSlider = () => {
    sound.playClick();
    const audio = audioRef.current;
    if (!audio) return;

    if (!showVolumeSlider) {
      setShowVolumeSlider(true);
      return;
    }

    if (isMuted || volume === 0) {
      const restore = prevVolume > 0 ? prevVolume : 0.8;
      setIsMuted(false);
      setVolume(restore);
      audio.volume = restore;
      showToast(`Volume: ${Math.round(restore * 100)}%`);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
      audio.volume = 0;
      showToast('Audio muted');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (newVol > 0) setPrevVolume(newVol);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVol;
    }

    try {
      localStorage.setItem('cursed_audio_volume', newVol.toString());
    } catch {
      // Ignore
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-rose-400" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-4 h-4 text-purple-300" />;
    }
    return <Volume2 className="w-4 h-4 text-purple-300" />;
  };

  return (
    <div
      style={{
        bottom: 'max(0.75rem, env(safe-area-inset-bottom, 12px))',
      }}
      className="fixed left-1/2 -translate-x-1/2 z-40 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-zinc-950/90 border border-white/15 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 text-xs w-[calc(100vw-1.5rem)] max-w-lg touch-manipulation"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={resolvedAudioSrc}
        loop
        preload="metadata"
        onError={handleAudioError}
      />

      {/* Rotating Vinyl Disc */}
      <motion.div
        animate={{ rotate: isPlaying && !isMuted && volume > 0 ? 360 : 0 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full bg-purple-950/70 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300 shadow-sm"
      >
        <Disc3 className="w-4.5 h-4.5" />
      </motion.div>

      {/* Track Details & Scrubber */}
      <div className="flex-1 min-w-0 pr-0.5">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-zinc-100 text-xs truncate max-w-[130px] sm:max-w-[200px]" title={activeSongTitle}>
              {activeSongTitle}
            </span>
            {activeSongArtist && (
              <span className="text-[10px] text-zinc-400 truncate hidden sm:inline">
                · {activeSongArtist}
              </span>
            )}
            {isPlaying && !isMuted && volume > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </div>

          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>

        {/* Progress Bar Scrubber with touch height */}
        <div className="relative flex items-center w-full py-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-purple-500 transition-all touch-pan-x focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* Upload / Switch Song button if provided */}
      {onOpenUpload && (
        <button
          onClick={onOpenUpload}
          className="w-8 h-8 rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/10 text-purple-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Upload MP3 or Change Song"
          aria-label="Upload MP3 or change song"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Play/Pause Button - Touch optimized size */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-92 text-white flex items-center justify-center shadow-md cursor-pointer shrink-0 transition-transform"
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Volume Controller with Touch Toggle */}
      <div
        className="relative flex items-center gap-1 shrink-0"
        onMouseEnter={() => setShowVolumeSlider(true)}
      >
        <button
          onClick={toggleMuteOrSlider}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title={isMuted || volume === 0 ? 'Unmute' : 'Volume'}
          aria-label="Volume controller"
        >
          {renderVolumeIcon()}
        </button>

        {/* Volume Slider Drawer */}
        <AnimatePresence>
          {showVolumeSlider && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: '88px', scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 overflow-hidden pl-1"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-white/25 rounded-full appearance-none cursor-pointer accent-purple-500 transition-all touch-pan-x focus:outline-none focus:ring-0"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
              <button
                onClick={() => setShowVolumeSlider(false)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer px-1"
                title="Close volume"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
