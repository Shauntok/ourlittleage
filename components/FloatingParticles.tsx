"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export default function FloatingParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 36 }).map((_, index) => ({
      id: index,
      size: 2 + ((index * 7) % 6),
      left: (index * 37) % 100,
      duration: 14 + ((index * 5) % 18),
      delay: (index * 1.7) % 10,
      drift: ((index * 23) % 80) - 40,
      opacity: 0.18 + ((index * 3) % 5) * 0.08,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            bottom: "-8%",
            filter: "blur(1px)",
          }}
          animate={{
            y: ["0vh", "-120vh"],
            x: [0, particle.drift],
            opacity: [0, particle.opacity, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}