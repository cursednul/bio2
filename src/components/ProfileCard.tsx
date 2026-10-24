import React, { useState, useRef, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Share2, Music2, Gamepad2, Play } from 'lucide-react';
import { ThemeConfig } from '../types';
import { sound } from '../utils/audio';

interface ProfileCardProps {
  theme: ThemeConfig;
  onShare: () => void;
  showToast: (msg: string) => void;
  favGame?: string;
  favSong?: string;
  nickname?: string;
  bioEmoticon?: string;
  avatarUrl?: string;
}

const DEFAULT_AVATAR = 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcTSW4n6wBabxHT5KCZgbMQ84MXD3KQ1JESGSzBWthTMzRN_SiO2';

export const ProfileCard: React.FC<ProfileCardProps> = ({
  theme,
  onShare,
  showToast,
  favGame = 'Watch Dogs 2',
  favSong = 'Cyberpunk Synthwave',
  nickname = 'cursed',
  bioEmoticon = '(˶>⩊<˶)',
  avatarUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Card tilt state
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  };

  const handleResetTilt = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
    setIsHovered(false);
  };

  const copyUsername = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText('@cursednul');
      setCopied(true);
      showToast('Copied @cursednul to clipboard ✨');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('@cursednul');
    }
  };

  const titleLetters = (nickname || 'cursed').split('');
  const activeAvatar = avatarUrl && avatarUrl.trim() ? avatarUrl : DEFAULT_AVATAR;

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000 px-2 sm:px-0">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleResetTilt}
        onTouchEnd={handleResetTilt}
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: isHovered ? 1.012 : 1,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-xl shadow-2xl transition-shadow duration-300 touch-manipulation"
      >
        {/* Dynamic Specular Glare Layer */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 z-10"
          style={{
            opacity: isHovered ? 0.6 : 0.2,
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
          }}
        />

        {/* Ambient Card Background Glow */}
        <div
          className="absolute -inset-[1px] rounded-3xl -z-10 blur-xl opacity-35 transition-colors duration-500"
          style={{ background: theme.glow }}
        />

        {/* Card Face Content */}
        <div className="flex flex-col items-center text-center relative z-20">
          {/* Top Share Action Row */}
          <div className="w-full flex items-center justify-end mb-1 text-xs text-zinc-400">
            <button
              onClick={onShare}
              title="Share Profile"
              aria-label="Share Profile"
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar with Smooth Hologram Glow Aura */}
          <div className="relative my-1 sm:my-2">
            <motion.div
              animate={{
                scale: [1, 1.14, 1],
                opacity: [0.35, 0.65, 0.35],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -inset-3 rounded-full blur-md pointer-events-none"
              style={{ background: theme.glow }}
            />

            <motion.div
              whileHover={{ scale: 1.06, rotate: -2 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-22 h-22 sm:w-28 sm:h-28 rounded-full overflow-hidden p-[3px] shadow-lg group select-none"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryLight}, #ffffff, ${theme.primary})`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 relative">
                <img
                  src={activeAvatar}
                  alt={`${nickname} avatar`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </motion.div>
          </div>

          {/* Name with Kinetic Shimmer & Hover/Tap Letter Bounce */}
          <div className="mt-3 select-none">
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-wide flex items-center justify-center cursor-default"
              style={{
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {titleLetters.map((char, idx) => (
                <motion.span
                  key={idx}
                  whileHover={{
                    y: -5,
                    scale: 1.25,
                    color: theme.primaryLight,
                    transition: { type: 'spring', stiffness: 500, damping: 12 },
                  }}
                  whileTap={{
                    y: -4,
                    scale: 1.2,
                    color: theme.primaryLight,
                  }}
                  className="inline-block transition-colors px-0.5"
                  style={{
                    backgroundImage: `linear-gradient(115deg, #ffffff 0%, ${theme.primaryLight} 45%, #ffffff 80%, ${theme.primary} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: `0 0 20px ${theme.glow}`,
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </h1>
          </div>

          {/* Subtitle Handle with Copy Interaction */}
          <motion.button
            onClick={copyUsername}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            className="mt-2 flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-full text-xs font-mono text-zinc-300 active:text-white bg-white/5 active:bg-white/15 hover:bg-white/10 border border-white/5 transition-all group cursor-pointer"
            title="Click to copy username"
          >
            <span>@cursednul</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            )}
          </motion.button>

          {/* Bio / Emoticon tag */}
          <div className="mt-3.5 flex flex-col items-center">
            <span className="text-xl sm:text-2xl font-mono text-zinc-100 py-1 px-3.5 rounded-xl bg-white/5 border border-white/5 select-none">
              {bioEmoticon}
            </span>
          </div>

          {/* Dynamic Favorite Game & Song Status Strip */}
          <div className="mt-5 sm:mt-6 w-full pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div className="flex items-center gap-1.5 truncate text-left select-none">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate font-medium text-zinc-300">
                {favGame}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-400 shrink-0 text-right">
              <Music2 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span
                className="font-mono text-[10px] text-zinc-300 truncate max-w-[150px] sm:max-w-[180px]"
                title={favSong}
              >
                {favSong}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
