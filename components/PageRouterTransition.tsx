"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageRouterTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className="relative z-0 pointer-events-auto"
      initial={{
        opacity: 0.92,
        y: 6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}