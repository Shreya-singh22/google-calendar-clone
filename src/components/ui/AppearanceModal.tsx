'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, X } from 'lucide-react';
import { useThemeStore, type Theme } from '@/store/themeStore';

interface AppearanceModalProps {
  open: boolean;
  onClose: () => void;
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'light',  label: 'Light',  icon: <Sun  className="w-5 h-5" />, description: 'Always use light theme' },
  { value: 'dark',   label: 'Dark',   icon: <Moon className="w-5 h-5" />, description: 'Always use dark theme' },
  { value: 'system', label: 'System', icon: <Monitor className="w-5 h-5" />, description: 'Follow your OS setting' },
];

export function AppearanceModal({ open, onClose }: AppearanceModalProps) {
  const { theme, setTheme } = useThemeStore();

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
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Appearance</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 flex flex-col gap-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTheme(opt.value); onClose(); }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
                    theme === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className={theme === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                    {opt.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                  {theme === opt.value && (
                    <span className="ml-auto text-blue-500">
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
