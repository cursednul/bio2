import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, Volume1, VolumeX, Disc3, Plus, Youtube } from 'lucide-react';
import { ThemeConfig } from '../types';
import { sound } from '../utils/audio';
import { getStoredAudioUrl } from '../utils/audioStorage';
import { extractYouTubeVideoId } from '../utils/youtubeService';

interface AudioPlayerBarProps {
  theme: ThemeConfig;
  showToast: (msg: string) => void;
  activeSongTitle?: string;
  activeSongArtist?: string;
  activeSongUrl?: string;
  onOpenUpload?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  theme,
  showToast,
  activeSongTitle = '',
  activeSongArtist = '',
  activeSongUrl,
  onOpenUpload,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string>('');
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

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
  const volumeContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect YouTube video ID if URL is a YouTube Music link or youtube:// ID
  useEffect(() => {
    const extractedId = extractYouTubeVideoId(activeSongUrl || '');
    setYtVideoId(extractedId);
  }, [activeSongUrl]);

  // Close floating volume slider when tapping/clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        volumeContainerRef.current &&
        !volumeContainerRef.current.contains(e.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [showVolumeSlider]);

  // Resolve activeSongUrl for non-YouTube tracks
  useEffect(() => {
    let isMounted = true;

    async function resolveSrc() {
      if (!activeSongUrl || !activeSongUrl.trim() || extractYouTubeVideoId(activeSongUrl)) {
        if (isMounted) {
          setResolvedAudioSrc('');
          setIsLoadingTrack(false);
        }
        return;
      }

      // Fast-path: Direct external URLs or local memory blobs
      if (
        activeSongUrl.startsWith('http://') ||
        activeSongUrl.startsWith('https://') ||
        activeSongUrl.startsWith('blob:') ||
        activeSongUrl.startsWith('data:')
      ) {
        if (isMounted) {
          setResolvedAudioSrc(activeSongUrl);
          setIsLoadingTrack(false);
        }
        return;
      }

      // Universal cross-device resolver
      if (isMounted) setIsLoadingTrack(true);
      try {
        const resolved = await getStoredAudioUrl(activeSongUrl);
        if (isMounted) {
          setResolvedAudioSrc(resolved || (activeSongUrl && !activeSongUrl.startsWith('firestore://') ? activeSongUrl : ''));
          setIsLoadingTrack(false);
        }
      } catch {
        if (isMounted) {
          setResolvedAudioSrc(activeSongUrl && !activeSongUrl.startsWith('firestore://') ? activeSongUrl : '');
          setIsLoadingTrack(false);
        }
      }
    }

    resolveSrc();
    return () => {
      isMounted = false;
    };
  }, [activeSongUrl]);

  // Handle YouTube IFrame Player initialization & playback
  useEffect(() => {
    if (!ytVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore
        }
        ytPlayerRef.current = null;
      }
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      return;
    }

    // Stop standard HTML5 audio when playing YouTube
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsLoadingTrack(true);

    const initYTPlayer = () => {
      if (!ytContainerRef.current) return;
      
      // Clean previous container element
      ytContainerRef.current.innerHTML = '<div id="yt-player-target"></div>';

      try {
        ytPlayerRef.current = new (window as any).YT.Player('yt-player-target', {
          videoId: ytVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              const p = event.target;
              p.setVolume(isMuted ? 0 : volume * 100);
              p.pauseVideo();
              setIsLoadingTrack(false);
              setIsPlaying(false);
            },
            onStateChange: (event: any) => {
              const state = event.data;
              // YT.PlayerState.PLAYING = 1
              if (state === 1) {
                setIsPlaying(true);
                setIsLoadingTrack(false);
                if (ytPlayerRef.current?.getDuration) {
                  setDuration(ytPlayerRef.current.getDuration() || 0);
                }
                if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
                ytIntervalRef.current = setInterval(() => {
                  if (ytPlayerRef.current?.getCurrentTime && !isScrubbing) {
                    setCurrentTime(ytPlayerRef.current.getCurrentTime() || 0);
                  }
                }, 500);
              } else if (state === 2) { // PAUSED
                setIsPlaying(false);
                if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
              } else if (state === 0) { // ENDED
                setIsPlaying(false);
                setCurrentTime(0);
                if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player Error:', err);
              setIsLoadingTrack(false);
              setIsPlaying(false);
            },
          },
        });
      } catch (err) {
        console.warn('Failed to construct YouTube player:', err);
        setIsLoadingTrack(false);
      }
    };

    // Load YouTube IFrame API script if not already present
    if (typeof (window as any).YT === 'undefined' || !(window as any).YT.Player) {
      const existingScript = document.getElementById('youtube-iframe-api-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api-script';
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      (window as any).onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    } else {
      initYTPlayer();
    }

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [ytVideoId]);

  // When resolved track source changes for standard HTML5 audio
  useEffect(() => {
    if (ytVideoId) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (!resolvedAudioSrc) {
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setBufferedTime(0);
      return;
    }

    const currentAttr = audio.getAttribute('src');
    if (currentAttr === resolvedAudioSrc || (resolvedAudioSrc && audio.src && (audio.src === resolvedAudioSrc || audio.src.endsWith(resolvedAudioSrc)))) {
      return;
    }

    const wasPlaying = isPlaying;
    audio.src = resolvedAudioSrc;
    audio.load();
    setCurrentTime(0);

    if (wasPlaying) {
      const handleCanPlay = () => {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback error on track change:', err);
            setIsPlaying(false);
          });
      };
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [resolvedAudioSrc, ytVideoId]);

  // Listen to standard HTML5 audio events when not using YouTube
  useEffect(() => {
    if (ytVideoId) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;

    const updateTime = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };
    const updateDuration = () => setDuration(audio.duration || 0);
    const updateProgress = () => {
      if (audio.buffered.length > 0) {
        setBufferedTime(audio.buffered.end(audio.buffered.length - 1));
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('progress', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('progress', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, isMuted, isScrubbing, ytVideoId]);

  const handleAudioError = () => {
    const audio = audioRef.current;
    if (audio?.error) {
      console.warn('Audio media error encountered:', audio.error.message || audio.error.code);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    sound.playClick();

    if (isLoadingTrack) {
      showToast('Loading track... ⏳');
      return;
    }

    // YouTube playback
    if (ytVideoId) {
      const p = ytPlayerRef.current;
      if (p && typeof p.playVideo === 'function') {
        if (isPlaying) {
          p.pauseVideo();
          setIsPlaying(false);
          showToast(`Paused ${activeSongTitle || 'YouTube Music'}`);
        } else {
          p.playVideo();
          setIsPlaying(true);
          showToast(`Playing ${activeSongTitle || 'YouTube Music'} 🎵`);
        }
      } else {
        showToast('Initializing YouTube Music... 🎵');
      }
      return;
    }

    // HTML5 audio playback
    const audio = audioRef.current;
    if (!audio) return;

    const currentSrc = resolvedAudioSrc;
    if (!currentSrc) {
      showToast('No audio source loaded');
      return;
    }

    if (!audio.src || (audio.getAttribute('src') !== currentSrc && audio.src !== currentSrc)) {
      audio.src = currentSrc;
      audio.load();
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      showToast(`Paused ${activeSongTitle || 'Audio'}`);
    } else {
      try {
        if (audio.readyState === 0) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
        showToast(`Playing ${activeSongTitle || 'Track'} 🎵`);
      } catch (err: any) {
        console.warn('Playback failed:', err);
        setIsPlaying(false);
        if (err?.name === 'NotAllowedError') {
          showToast('Tap play to start audio 🎵');
        } else {
          showToast(`Tap play again to start ${activeSongTitle || 'track'}`);
        }
      }
    }
  };

  const toggleMute = () => {
    sound.playClick();

    const newMute = !(isMuted || volume === 0);
    const restore = prevVolume > 0 ? prevVolume : 0.8;
    const targetVol = newMute ? 0 : restore;

    setIsMuted(newMute);
    if (!newMute) setVolume(restore);

    // Update YouTube volume
    if (ytVideoId && ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(targetVol * 100));
      } catch {
        // Ignore
      }
    }

    // Update HTML5 audio volume
    const audio = audioRef.current;
    if (audio) {
      audio.volume = targetVol;
    }

    showToast(newMute ? 'Audio muted' : `Volume: ${Math.round(restore * 100)}%`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (newVol > 0) setPrevVolume(newVol);

    if (ytVideoId && ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(newVol * 100));
      } catch {
        // Ignore
      }
    }

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

  const handleScrubStart = () => {
    setIsScrubbing(true);
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
  };

  const handleScrubEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsScrubbing(false);
    const target = e.currentTarget as HTMLInputElement;
    const time = Number(target.value);
    setCurrentTime(time);

    if (ytVideoId && ytPlayerRef.current?.seekTo) {
      try {
        ytPlayerRef.current.seekTo(time, true);
      } catch {
        // Ignore
      }
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
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

  const displayTitle = activeSongTitle || (resolvedAudioSrc ? 'Live Audio' : 'No Track Selected');
  const displayArtist = activeSongArtist;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, Math.max(0, (bufferedTime / duration) * 100)) : 0;

  return (
    <div
      style={{
        bottom: 'max(0.65rem, env(safe-area-inset-bottom, 10px))',
      }}
      className="fixed left-1/2 -translate-x-1/2 z-40 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-zinc-950/92 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center gap-2 sm:gap-2.5 text-xs w-[calc(100vw-1.25rem)] sm:w-[calc(100vw-2rem)] max-w-lg touch-manipulation select-none"
    >
      {/* Hidden audio & YouTube player elements */}
      <audio
        ref={audioRef}
        src={resolvedAudioSrc || undefined}
        loop
        playsInline
        preload="auto"
        onError={handleAudioError}
      />
      <div ref={ytContainerRef} className="hidden w-0 h-0 overflow-hidden pointer-events-none absolute" />

      {/* Rotating Vinyl Disc */}
      <motion.div
        animate={{ rotate: isPlaying && !isMuted && volume > 0 ? 360 : 0 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-950/80 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300 shadow-sm relative"
      >
        {ytVideoId ? <Youtube className="w-4 h-4 text-red-400" /> : <Disc3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
      </motion.div>

      {/* Track Details & Scrubber */}
      <div className="flex-1 min-w-0 pr-0.5">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="font-semibold text-zinc-100 text-[11px] sm:text-xs truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[210px]"
              title={displayTitle}
            >
              {displayTitle}
            </span>
            {displayArtist && (
              <span className="text-[10px] text-zinc-400 truncate hidden xs:inline sm:inline">
                · {displayArtist}
              </span>
            )}
            {isPlaying && !isMuted && volume > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </div>

          <span className="text-[10px] font-mono text-zinc-400 shrink-0 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>

        {/* Progress Bar with buffer track and seek input */}
        <div className="relative flex items-center w-full h-5 cursor-pointer">
          {/* Buffer visualizer */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-full bg-white/15 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-white/20 transition-all duration-300"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-indigo-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>



          <input
            type="range"
            min={0}
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onChange={handleScrubChange}
            onMouseUp={handleScrubEnd}
            onTouchEnd={handleScrubEnd}
            className="w-full h-6 opacity-0 cursor-pointer touch-none focus:outline-none focus:ring-0 z-10"
            aria-label="Seek track position"
          />
        </div>
      </div>

      {/* Upload / Switch Song button if provided (Admin only) */}
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

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={isLoadingTrack}
        className="w-8 h-8 sm:w-8 sm:h-8 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white flex items-center justify-center shadow-md cursor-pointer shrink-0 transition-transform disabled:opacity-80"
        title={isLoadingTrack ? 'Loading track...' : isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isLoadingTrack ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white animate-spin">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Floating Volume Controller Popover */}
      <div ref={volumeContainerRef} className="relative flex items-center shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            setShowVolumeSlider((prev) => !prev);
          }}
          className="w-8 h-8 rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title={isMuted || volume === 0 ? 'Unmute / Volume' : 'Volume'}
          aria-label="Volume controller"
        >
          {renderVolumeIcon()}
        </button>

        {/* Floating Popover: Does not shift or crush the player bar on mobile */}
        <AnimatePresence>
          {showVolumeSlider && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full right-0 mb-3 px-3 py-2.5 rounded-2xl bg-zinc-950/95 border border-purple-500/30 backdrop-blur-2xl shadow-2xl flex items-center gap-2.5 z-50 text-xs min-w-[170px]"
            >
              <button
                onClick={toggleMute}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer shrink-0"
                title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                aria-label="Mute toggle"
              >
                {renderVolumeIcon()}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 sm:w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-purple-500 touch-pan-x focus:outline-none"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
              <span className="font-mono text-[10px] text-zinc-400 w-8 text-right tabular-nums shrink-0">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
              <button
                onClick={() => setShowVolumeSlider(false)}
                className="text-[11px] font-mono text-zinc-400 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/10 shrink-0"
                title="Close volume slider"
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
