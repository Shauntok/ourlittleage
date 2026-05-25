"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export default function MouseGlow() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, {
    damping: 40,
    stiffness: 120,
  });

  const smoothY = useSpring(mouseY, {
    damping: 40,
    stiffness: 120,
  });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mouseX.set(e.clientX - 200);
      mouseY.set(e.clientY - 200);
    }

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
    };
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="
        pointer-events-none fixed z-[2]
        h-[400px] w-[400px]
        rounded-full
        bg-violet-500/10
        blur-3xl
      "
      style={{
        x: smoothX,
        y: smoothY,
      }}
    />
  );
}