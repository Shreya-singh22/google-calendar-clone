'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import { useSettingsStore, type CalendarSettings } from '@/store/settingsStore';
import type { CalendarView } from '@/store';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <label className="text-sm text-gray-700 dark:text-gray-200">{label}</label>
      <select
        value={String(value)}
        onChange={e => {
          const raw = e.target.value;
          const parsed = options.find(o => String(o.value) === raw);
          if (parsed) onChange(parsed.value);
        }}
        className="text-sm bg-white dark:bg-[#3c3d40] border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
      >
        {options.map(o => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useSettingsStore();

  const patch = (p: Partial<CalendarSettings>) => settings.updateSettings(p);

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
              <div className="flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-2">
              <Select
                label="Week starts on"
                value={settings.weekStartsOn}
                options={[
                  { value: 0 as const, label: 'Sunday' },
                  { value: 1 as const, label: 'Monday' },
                ]}
                onChange={(v) => patch({ weekStartsOn: v as 0 | 1 })}
              />
              <Select
                label="Default view"
                value={settings.defaultView}
                options={[
                  { value: 'month' as CalendarView, label: 'Month' },
                  { value: 'week'  as CalendarView, label: 'Week' },
                  { value: 'day'   as CalendarView, label: 'Day' },
                ]}
                onChange={(v) => patch({ defaultView: v as CalendarView })}
              />
              <Select
                label="Default event duration"
                value={settings.defaultEventDuration}
                options={[
                  { value: 30 as const, label: '30 minutes' },
                  { value: 60 as const, label: '1 hour' },
                ]}
                onChange={(v) => patch({ defaultEventDuration: v as 30 | 60 })}
              />
              <Toggle
                label="Show weekends"
                description="Show Saturday and Sunday in Week and Day views"
                checked={settings.showWeekends}
                onChange={(v) => patch({ showWeekends: v })}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-4">
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
