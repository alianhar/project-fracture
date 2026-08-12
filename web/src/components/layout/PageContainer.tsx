import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.main
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-8', className)}
    >
      {children}
    </motion.main>
  );
}
