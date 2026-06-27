'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlignLeft } from 'lucide-react';
import { CalendarEvent } from '@/lib/data/types';
import { CALENDAR_COLORS, ColorId } from '@/lib/colors';
import { useEffect, useRef, useState } from 'react';

interface CalendarOption {
  id: string;
  name: string;
  colorId: string;
}

const FALLBACK_CALENDARS: CalendarOption[] = [
  { id: 'personal', name: 'Personal', colorId: 'Tomato' },
  { id: 'work', name: 'Work', colorId: 'Peacock' },
  { id: 'birthdays', name: 'Birthdays', colorId: 'Lavender' },
];

interface EventEditorProps {
  initialData?: Partial<CalendarEvent>;
  calendars?: CalendarOption[];
  onClose: () => void;
  onSave: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
}

function toDatetimeLocal(utcIso: string): string {
  const d = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(localStr: string): string {
  return new Date(localStr).toISOString();
}

export function EventEditor({ initialData, calendars: calendarsProp, onClose, onSave }: EventEditorProps) {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const calendarOptions = calendarsProp ?? FALLBACK_CALENDARS;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [allDay, setAllDay] = useState(initialData?.allDay ?? false);
  const [colorId, setColorId] = useState<string>(initialData?.colorId ?? 'Blueberry');
  const [calendarId, setCalendarId] = useState(() => {
    const id = initialData?.calendarId;
    if (id && calendarOptions.some(c => c.id === id)) return id;
    return calendarOptions[0]?.id ?? 'personal';
  });
  const [startLocal, setStartLocal] = useState(
    initialData?.startUtc ? toDatetimeLocal(initialData.startUtc) : toDatetimeLocal(now.toISOString())
  );
  const [endLocal, setEndLocal] = useState(
    initialData?.endUtc ? toDatetimeLocal(initialData.endUtc) : toDatetimeLocal(oneHourLater.toISOString())
  );
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const startUtc = fromDatetimeLocal(startLocal);
    const endUtc = fromDatetimeLocal(endLocal);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (new Date(endUtc) <= new Date(startUtc)) {
      setError('End time must be after start time');
      return;
    }

    onSave({
      id: initialData?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startUtc,
      endUtc,
      allDay,
      colorId,
      calendarId,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <motion.div
          className="w-full max-w-lg bg-white dark:bg-[#2d2e31] rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          {/* Color accent */}
          <div className="h-2" style={{ backgroundColor: CALENDAR_COLORS[colorId as ColorId] || CALENDAR_COLORS.Blueberry }} />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {initialData?.id ? 'Edit event' : 'New event'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(null); }}
              placeholder="Add title"
              className="w-full text-2xl font-medium border-b-2 border-blue-500 outline-none bg-transparent text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-600 pb-1"
              autoFocus
            />

            {/* All Day Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setAllDay(!allDay)}
                className={`relative w-10 h-5 rounded-full transition-colors ${allDay ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-200">All day</span>
            </label>

            {/* Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? startLocal.split('T')[0] : startLocal}
                  onChange={e => setStartLocal(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-[#3c3d40] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? endLocal.split('T')[0] : endLocal}
                  onChange={e => setEndLocal(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-[#3c3d40] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Add location"
                className="flex-1 text-sm border-b border-gray-200 dark:border-gray-700 outline-none bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 pb-1 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="flex items-start gap-3">
              <AlignLeft className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add description"
                rows={3}
                className="flex-1 text-sm border-b border-gray-200 dark:border-gray-700 outline-none bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 pb-1 focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Calendar Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Calendar:</span>
              <select
                value={calendarId}
                onChange={e => setCalendarId(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-[#3c3d40] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {calendarOptions.map(cal => (
                  <option key={cal.id} value={cal.id}>{cal.name}</option>
                ))}
              </select>
            </div>

            {/* Color Picker */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Event color</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CALENDAR_COLORS).map(([id, hex]) => (
                  <button
                    key={id}
                    onClick={() => setColorId(id)}
                    title={id}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${colorId === id ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
