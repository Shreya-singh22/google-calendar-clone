'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Calendar, Trash2, Edit2 } from 'lucide-react';
import { CalendarEvent } from '@/lib/data/types';
import { CALENDAR_COLORS, ColorId } from '@/lib/colors';
import { format } from 'date-fns';
import { useEffect, useRef } from 'react';

interface DetailPopoverProps {
  event: CalendarEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (event: CalendarEvent) => void;
}

export function DetailPopover({ event, anchor, onClose, onDelete, onEdit }: DetailPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const colorHex = CALENDAR_COLORS[event.colorId as ColorId] || CALENDAR_COLORS.Blueberry;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Smart positioning: avoid going off-screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(anchor.x, window.innerWidth - 340),
    top: Math.min(anchor.y, window.innerHeight - 300),
    zIndex: 50,
  };

  const startDate = new Date(event.startUtc);
  const endDate = new Date(event.endUtc);

  const formatTime = (d: Date) => format(d, 'h:mm a');
  const formatDate = (d: Date) => format(d, 'EEEE, MMMM d');

  return (
    <motion.div
      ref={popoverRef}
      style={style}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-80 bg-white dark:bg-[#2d2e31] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      {/* Color Header Strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: colorHex }} />

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-1">
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-1 shrink-0">
          {!event.readOnly && (
            <>
              <button
                onClick={() => onEdit(event)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                title="Edit event"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(event.id)}
                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-5 space-y-3">
        <div className="flex gap-3">
          <div
            className="w-3 h-3 rounded-sm mt-1 shrink-0"
            style={{ backgroundColor: colorHex }}
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 leading-tight">
              {event.title}
            </h2>
            {event.allDay ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {formatDate(startDate)} · All day
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {formatDate(startDate)}
                <br />
                {formatTime(startDate)} – {formatTime(endDate)}
              </p>
            )}
          </div>
        </div>

        {event.location && (
          <div className="flex gap-3 items-start">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{event.location}</span>
          </div>
        )}

        {event.description && (
          <div className="flex gap-3 items-start">
            <span className="text-gray-400 mt-0.5 shrink-0">≡</span>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        <div className="flex gap-3 items-center">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{event.calendarId}</span>
        </div>

        {event.readOnly && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 w-fit">
            <span className="text-xs">🇮🇳</span>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Public holiday</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
