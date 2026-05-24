'use client';

import { motion } from 'framer-motion';

export default function LiquidBackground() {
  return (
    <div className="liquid-bg">
      {/* Base Image Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: "url('/bg-premium.jpg')" }}
      />
      
      {/* Animated Overlay Blobs for Depth */}
      <motion.div
        className="blob opacity-30"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Darken/Vignette Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
      
      {/* Noise Texture */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
    </div>
  );
}
