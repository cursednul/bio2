import React from 'react';
import { motion } from 'motion/react';

export const LoadingScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 pointer-events-auto"
    >
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.12, 1],
        }}
        transition={{
          rotate: { duration: 2.2, repeat: Infinity, ease: 'linear' },
          scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="relative flex items-center justify-center text-purple-400"
      >
        {/* Ambient violet glow aura */}
        <div className="absolute inset-0 rounded-full blur-xl bg-purple-500/35 scale-150 pointer-events-none" />

        {/* 4-Point Signature Spinning Star */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-12 h-12 text-purple-400 drop-shadow-[0_0_18px_rgba(168,85,247,0.75)]"
        >
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </motion.div>
    </motion.div>
  );
};
