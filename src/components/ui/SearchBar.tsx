'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEventRepository } from '@/lib/data/useEventRepository';
import { CalendarEvent } from '@/lib/data/types';
import { format, parseISO } from 'date-fns';

const COLOR_HEX: Record<string, string> = {
  Tomato: '#d50000', Flamingo: '#e67c73', Tangerine: '#f4511e',
  Banana: '#f6bf26', Sage: '#33b679', Basil: '#0f9d58',
  Peacock: '#039be5', Blueberry: '#3f51b5', Lavender: '#7986cb',
  Grape: '#8e24aa', Graphite: '#616161',
};

interface SearchBarProps {
  open: boolean;
  onClose: () => void;
  onEventSelect: (event: CalendarEvent) => void;
}

export function SearchBar({ open, onClose, onEventSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const repo = useEventRepository();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open; reset on close
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await repo.search(q);
      setResults(res.slice(0, 10));
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [repo]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, doSearch]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSelect = (ev: CalendarEvent) => {
    onEventSelect(ev);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-20"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: -16, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.18, type: 'spring', stiffness: 420, damping: 32 }}
            className="bg-white dark:bg-[#2d2e31] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search events…"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Results */}
            {query.trim() && (
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">No events found for &ldquo;{query}&rdquo;</p>
                ) : (
                  <ul>
                    {results.map(ev => (
                      <li key={ev.id}>
                        <button
                          onClick={() => handleSelect(ev)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLOR_HEX[ev.colorId] ?? '#8e8e8e' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{ev.title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {ev.allDay
                                ? format(parseISO(ev.startUtc), 'MMM d, yyyy')
                                : format(parseISO(ev.startUtc), 'MMM d, yyyy · h:mm a')}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
