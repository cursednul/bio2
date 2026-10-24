import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Copy, Check, LayoutGrid, Rows } from 'lucide-react';
import { SocialLink, ThemeConfig } from '../types';
import { sound } from '../utils/audio';

interface SocialLinksProps {
  theme: ThemeConfig;
  viewMode: 'cards' | 'dock';
  isAdmin: boolean;
  onSetViewMode: (mode: 'cards' | 'dock') => void;
  showToast: (msg: string) => void;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'telegram',
    title: 'Telegram',
    handle: '@cursednul',
    url: 'https://t.me/cursednul',
    icon: 'telegram',
    copyValue: 'https://t.me/cursednul',
    color: '#2AABEE',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    handle: '@cursednul',
    url: 'https://www.tiktok.com/@cursednul',
    icon: 'tiktok',
    copyValue: 'https://www.tiktok.com/@cursednul',
    color: '#FE2C55',
  },
  {
    id: 'instagram',
    title: 'Instagram',
    handle: '@cursednul',
    url: 'https://www.instagram.com/cursednul/',
    icon: 'instagram',
    copyValue: 'https://www.instagram.com/cursednul/',
    color: '#E4405F',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    handle: '@cursednul',
    url: 'https://www.youtube.com/@cursednul',
    icon: 'youtube',
    copyValue: 'https://www.youtube.com/@cursednul',
    color: '#FF0000',
  },
  {
    id: 'discord',
    title: 'Discord',
    handle: 'ID: 910428526614810674',
    url: 'https://discord.com/users/910428526614810674',
    icon: 'discord',
    copyValue: '910428526614810674',
    color: '#5865F2',
  },
  {
    id: 'steam',
    title: 'Steam',
    handle: '76561199522386013',
    url: 'https://steamcommunity.com/profiles/76561199522386013/',
    icon: 'steam',
    copyValue: 'https://steamcommunity.com/profiles/76561199522386013/',
    color: '#66C0F4',
  },
];

export const SocialLinks: React.FC<SocialLinksProps> = ({
  theme,
  viewMode,
  isAdmin,
  onSetViewMode,
  showToast,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SocialLink | null>(null);

  const handleCopy = async (e: React.MouseEvent, link: SocialLink) => {
    e.stopPropagation();
    e.preventDefault();
    sound.playClick();
    try {
      await navigator.clipboard.writeText(link.copyValue || link.url);
      setCopiedId(link.id);
      showToast(`Copied ${link.title} info! ✨`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast(link.copyValue || link.url);
    }
  };

  const renderIcon = (type: string, className = 'w-5 h-5') => {
    switch (type) {
      case 'telegram':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.658-.643.135-.953l11.56-4.441c.538-.196 1.006.128.832.941z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.68v12.7a2.85 2.85 0 1 1-2.45-2.92c.41 0 .81.04 1.2.12V7.07a6.3 6.3 0 0 0-1.02-.08A6.34 6.34 0 0 0 5.4 19.86a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.6a4.7 4.7 0 0 1-.4-.05z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 110-2.881 1.44 1.44 0 010 2.881z" />
          </svg>
        );
      case 'youtube':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case 'discord':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.607 1.252a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.252.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.1.246.199.373.292a.077.077 0 0 1-.007.128 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.699.77 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.030.077.077 0 0 0 .032-.054c.5-4.917-.838-9.229-3.549-13.035a.061.061 0 0 0-.031-.03zM8.02 15.278c-1.122 0-2.04-1.029-2.04-2.291 0-1.263.904-2.291 2.04-2.291 1.138 0 2.058 1.029 2.04 2.291 0 1.263-.904 2.291-2.04 2.291zm7.975 0c-1.122 0-2.04-1.029-2.04-2.291 0-1.263.904-2.291 2.04-2.291 1.138 0 2.058 1.029 2.04 2.291 0 1.263-.902 2.291-2.04 2.291z" />
          </svg>
        );
      case 'steam':
        return (
          <svg className={className} viewBox="0 0 32 32" fill="currentColor">
            <path d="M18.102 12.129c0-0 0-0 0-0.001 0-1.564 1.268-2.831 2.831-2.831s2.831 1.268 2.831 2.831c0 1.564-1.267 2.831-2.831 2.831-0 0-0 0-0.001 0h0c-0 0-0 0-0.001 0-1.563 0-2.83-1.267-2.83-2.83 0-0 0-0 0-0.001v0zM24.691 12.135c0-2.081-1.687-3.768-3.768-3.768s-3.768 1.687-3.768 3.768c0 2.081 1.687 3.768 3.768 3.768v0c2.080-0.003 3.765-1.688 3.768-3.767v-0zM10.427 23.76l-1.841-0.762c0.524 1.078 1.611 1.808 2.868 1.808 1.317 0 2.448-0.801 2.93-1.943l0.008-0.021c0.155-0.362 0.246-0.784 0.246-1.226 0-1.757-1.424-3.181-3.181-3.181-0.405 0-0.792 0.076-1.148 0.213l0.022-0.007 1.903 0.787c0.852 0.364 1.439 1.196 1.439 2.164 0 1.296-1.051 2.347-2.347 2.347-0.324 0-0.632-0.066-0.913-0.184l0.015 0.006zM15.974 1.004c-7.857 0.001-14.301 6.046-14.938 13.738l-0.004 0.054 8.038 3.322c0.668-0.462 1.495-0.737 2.387-0.737 0.001 0 0.002 0 0.002 0h-0c0.079 0 0.156 0.005 0.235 0.008l3.575-5.176v-0.074c0.003-3.12 2.533-5.648 5.653-5.648 3.122 0 5.653 2.531 5.653 5.653s-2.531 5.653-5.653 5.653h-0.131l-5.094 3.638c0 0.065 0.005 0.131 0.005 0.199 0 0.001 0 0.002 0 0.003 0 2.342-1.899 4.241-4.241 4.241-2.047 0-3.756-1.451-4.153-3.38l-0.005-0.027-5.755-2.383c1.841 6.345 7.601 10.905 14.425 10.905 8.281 0 14.994-6.713 14.994-14.994s-6.713-14.994-14.994-14.994c-0 0-0.001 0-0.001 0h0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6 px-1 sm:px-0">
      {/* View Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
          <span>SOCIALS</span>
          {isAdmin && (
            <span className="text-[10px] text-purple-400 font-normal">
              (Admin Control)
            </span>
          )}
        </div>

        {/* View Switcher only accessible to Admin - Min 44px touch targets */}
        {isAdmin && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs">
            <button
              onClick={() => {
                sound.playClick();
                onSetViewMode('cards');
                showToast('Socials set to Cards View for all visitors');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onSetViewMode('dock');
                showToast('Socials set to Dock View for all visitors');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                viewMode === 'dock'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dock</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          /* Cards View - Touch Ergonomics with distinct touch targets */
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5"
          >
            {SOCIAL_LINKS.map((link, index) => {
              const isCopied = copiedId === link.id;
              return (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  whileHover={{ scale: 1.015, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={() => setHoveredLink(link)}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="group relative flex items-center justify-between p-3.5 sm:p-3 rounded-2xl bg-white/[0.04] active:bg-white/[0.09] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 backdrop-blur-md transition-all shadow-sm overflow-hidden touch-manipulation min-h-[58px]"
                >
                  {/* Subtle Colored Accent Ribbon on hover */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: link.color }}
                  />

                  {/* Left: Icon + Title + Handle */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-108 shadow-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: link.color,
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      {renderIcon(link.icon, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="font-semibold text-sm text-zinc-100 group-hover:text-white transition-colors">
                        {link.title}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                        {link.handle}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions with 44px tap target separation */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Copy Button - Min 44px touch target on mobile */}
                    <button
                      onClick={(e) => handleCopy(e, link)}
                      title={`Copy ${link.title} handle`}
                      className="p-2.5 sm:p-2 min-w-[42px] min-h-[42px] rounded-xl bg-white/5 active:bg-white/15 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/5 transition-all flex items-center justify-center cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Open link arrow - Min 44px touch target */}
                    <div className="p-2.5 sm:p-2 min-w-[42px] min-h-[42px] rounded-xl bg-white/5 group-hover:bg-purple-600/30 text-zinc-400 group-hover:text-purple-300 border border-white/5 transition-all flex items-center justify-center">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </motion.div>
        ) : (
          /* Dock View - Large touch icons */
          <motion.div
            key="dock"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex items-center justify-center gap-3 sm:gap-4 flex-wrap shadow-xl max-w-full">
              {SOCIAL_LINKS.map((link) => (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.18, y: -6 }}
                  whileTap={{ scale: 0.92 }}
                  onMouseEnter={() => setHoveredLink(link)}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-white/5 active:bg-white/15 hover:bg-white/15 border border-white/10 hover:border-purple-400 shadow-md relative group transition-colors cursor-pointer touch-manipulation"
                  style={{ color: link.color }}
                  title={`${link.title} (${link.handle})`}
                  aria-label={`Open ${link.title}`}
                >
                  {renderIcon(link.icon, 'w-6 h-6')}
                </motion.a>
              ))}
            </div>

            {/* Hovered/Selected Tooltip */}
            <div className="h-9 mt-2 flex items-center justify-center text-xs font-mono text-zinc-400">
              {hoveredLink ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-zinc-200"
                >
                  <span className="font-semibold" style={{ color: hoveredLink.color }}>
                    {hoveredLink.title}
                  </span>
                  <span>·</span>
                  <span>{hoveredLink.handle}</span>
                </motion.div>
              ) : (
                <span className="text-[11px] text-zinc-500">Tap to connect directly</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
