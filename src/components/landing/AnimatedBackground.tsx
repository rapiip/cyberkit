'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="landing-grid" />
      <motion.div
        className="absolute -left-40 top-[-10%] h-[420px] w-[420px] rounded-full bg-cyber-cyan/10 blur-[120px]"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-10%] top-[30%] h-[480px] w-[480px] rounded-full bg-cyber-purple/10 blur-[130px]"
        animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-[30%] h-[400px] w-[400px] rounded-full bg-cyber-green/8 blur-[110px]"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
