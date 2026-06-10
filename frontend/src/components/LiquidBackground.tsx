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
      <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}
