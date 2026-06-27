'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-mono rounded border border-gray-200 dark:border-gray-600">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['d'], label: 'Day view' },
      { keys: ['w'], label: 'Week view' },
      { keys: ['m'], label: 'Month view' },
      { keys: ['t'], label: 'Go to today' },
      { keys: ['←'], label: 'Previous period' },
      { keys: ['→'], label: 'Next period' },
    ],
  },
  {
    title: 'Search & Panels',
    shortcuts: [
      { keys: ['/'], label: 'Open search' },
      { keys: ['?'], label: 'Keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close dialog / popover' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 380, damping: 30 }}
            className="bg-white dark:bg-[#2d2e31] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Keyboard shortcuts</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Sections */}
            <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
              {SECTIONS.map(section => (
                <div key={section.title} className="mb-4 last:mb-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                    {section.title}
                  </h3>
                  {section.shortcuts.map(s => (
                    <Shortcut key={s.label} keys={s.keys} label={s.label} />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
