'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { CalendarEvent, EventRepository } from '@/lib/data/types';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
  repo: EventRepository;
  onRestored: () => void;
}

export function TrashModal({ open, onClose, repo, onRestored }: TrashModalProps) {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await repo.listTrash());
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [repo]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleRestore = async (id: string) => {
    setWorking(id);
    try {
      await repo.restore(id);
      setItems(prev => prev.filter(e => e.id !== id));
      onRestored();
    } finally { setWorking(null); }
  };

  const handleDeleteForever = async (id: string) => {
    setWorking(id);
    try {
      await repo.remove(id, { permanent: true });
      setItems(prev => prev.filter(e => e.id !== id));
    } finally { setWorking(null); }
  };

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
            className="bg-white dark:bg-[#2d2e31] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Trash</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <p className="px-5 py-2 text-xs text-gray-400 dark:text-gray-500 shrink-0 border-b border-gray-100 dark:border-gray-700">
              Events are permanently deleted after 30 days.
            </p>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Trash2 className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">Trash is empty</p>
                </div>
              ) : (
                <ul>
                  {items.map(ev => (
                    <li
                      key={ev.id}
                      className="flex items-start gap-3 px-5 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{ev.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {ev.allDay
                            ? format(parseISO(ev.startUtc), 'MMM d, yyyy')
                            : format(parseISO(ev.startUtc), 'MMM d, yyyy · h:mm a')}
                          {ev.deletedAt && (
                            <span className="ml-2 text-gray-300 dark:text-gray-600">
                              · deleted {formatDistanceToNow(parseISO(ev.deletedAt), { addSuffix: true })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          disabled={!!working}
                          onClick={() => handleRestore(ev.id)}
                          title="Restore"
                          className="p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-40"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!!working}
                          onClick={() => handleDeleteForever(ev.id)}
                          title="Delete forever"
                          className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0 flex justify-end">
                <button
                  disabled={!!working || loading}
                  onClick={async () => {
                    setWorking('all');
                    for (const ev of items) {
                      await repo.remove(ev.id, { permanent: true });
                    }
                    setItems([]);
                    setWorking(null);
                  }}
                  className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium transition-colors disabled:opacity-40"
                >
                  Empty Trash
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
