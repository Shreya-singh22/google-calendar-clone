'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface OverlapWarningProps {
  overlappingTitles: string[];
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export function OverlapWarning({ overlappingTitles, onSaveAnyway, onCancel }: OverlapWarningProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="bg-white dark:bg-[#2d2e31] rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
          initial={{ scale: 0.9, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Event overlap</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This event overlaps with:
              </p>
              <ul className="mt-1 space-y-0.5">
                {overlappingTitles.map((t, i) => (
                  <li key={i} className="text-sm font-medium text-gray-800 dark:text-gray-100">· {t}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSaveAnyway}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Save anyway
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
