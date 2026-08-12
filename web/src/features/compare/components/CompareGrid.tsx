import { motion } from 'motion/react';
import type { CompareModelResult } from '@/lib/api/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ModelResultCard } from './ModelResultCard';

export function CompareGrid({ imageUrl, results }: { imageUrl: string; results: CompareModelResult[] }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {results.map((result, i) => (
        <motion.div
          key={result.model_id}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08, ease: 'easeOut' }}
        >
          <ModelResultCard imageUrl={imageUrl} result={result} />
        </motion.div>
      ))}
    </div>
  );
}
