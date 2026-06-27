'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';

interface QuickCreatePopoverProps {
  anchor: { x: number; y: number };
  defaultDate: Date;
  onClose: () => void;
  onSave: (data: { title: string; startUtc: string; endUtc: string; allDay: boolean }) => void;
  onMoreOptions: (data: { title: string; startUtc: string; endUtc: string; allDay: boolean }) => void;
}

export function QuickCreatePopover({
  anchor,
  defaultDate,
  onClose,
  onSave,
  onMoreOptions,
}: QuickCreatePopoverProps) {
  const [title, setTitle] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const startDate = defaultDate;
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const desktopStyle: React.CSSProperties = isMobile ? {} : {
    position: 'fixed',
    left: Math.min(anchor.x, window.innerWidth - 360),
    top: Math.min(anchor.y, window.innerHeight - 260),
    zIndex: 50,
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), startUtc: startDate.toISOString(), endUtc: endDate.toISOString(), allDay: false });
  };

  const handleMoreOptions = () => {
    onMoreOptions({ title: title.trim(), startUtc: startDate.toISOString(), endUtc: endDate.toISOString(), allDay: false });
  };

  if (isMobile) {
    return (
      <>
        <motion.div
          className="fixed inset-0 z-40 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          ref={popoverRef}
          className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#2d2e31] rounded-t-2xl shadow-2xl overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {format(startDate, 'EEEE, MMMM d')}
            </span>
            <button type="button" aria-label="Close" onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="px-4 py-4 space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Add title"
              className="w-full text-xl font-medium border-b-2 border-blue-500 outline-none bg-transparent text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-600 pb-1"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 pb-safe">
            <button type="button" onClick={handleMoreOptions} className="text-sm font-medium text-blue-600 dark:text-blue-400">More options</button>
            <button type="button" onClick={handleSave} disabled={!title.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">Save</button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <motion.div
      ref={popoverRef}
      style={desktopStyle}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-88 bg-white dark:bg-[#2d2e31] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {format(startDate, 'EEEE, MMMM d')}
        </span>
        <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="px-4 py-4 space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          placeholder="Add title"
          className="w-full text-xl font-medium border-b-2 border-blue-500 outline-none bg-transparent text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-600 pb-1"
        />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={handleMoreOptions} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">More options</button>
        <button type="button" onClick={handleSave} disabled={!title.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">Save</button>
      </div>
    </motion.div>
  );
}
