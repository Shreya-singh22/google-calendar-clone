'use client';

import { useCalendarStore } from '@/store';
import { Plus } from 'lucide-react';
import { MiniCalendar } from './MiniCalendar';
import { CALENDAR_COLORS, ColorId } from '@/lib/colors';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalendarListStore } from '@/store/calendarListStore';

interface SidebarProps { onCreateClick?: () => void; }

const FALLBACK_MY_CALENDARS = [
  { id: 'personal', name: 'Personal', color: CALENDAR_COLORS.Tomato },
  { id: 'work', name: 'Work', color: CALENDAR_COLORS.Peacock },
  { id: 'birthdays', name: 'Birthdays', color: CALENDAR_COLORS.Lavender },
];


export function Sidebar({ onCreateClick }: SidebarProps) {
  const { sidebarOpen, selectedCalendars, toggleCalendar } = useCalendarStore();
  const { calendars } = useCalendarListStore();

  const myCalendars = calendars.filter(c => c.kind === 'user').length > 0
    ? calendars.filter(c => c.kind === 'user').map(c => ({
        id: c.id,
        name: c.name,
        color: CALENDAR_COLORS[c.colorId as ColorId] ?? CALENDAR_COLORS.Blueberry,
      }))
    : FALLBACK_MY_CALENDARS;

  const holidayCalendars = calendars.filter(c => c.kind === 'holiday').map(c => ({
    id: c.id,
    name: c.name,
    color: CALENDAR_COLORS[c.colorId as ColorId] ?? CALENDAR_COLORS.Sage,
  }));

  const closeSidebar = () => useCalendarStore.getState().setSidebarOpen(false);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSidebar}
          />

          <motion.aside
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] shrink-0 h-full flex flex-col overflow-hidden"
          >
          <div className="flex flex-col h-full overflow-y-auto py-4 w-64">
            {/* Create button */}
            <div className="px-4 mb-5">
              <button
                type="button"
                onClick={() => { onCreateClick?.(); closeSidebar(); }}
                className="group flex items-center gap-2 pl-3 pr-5 py-3 rounded-2xl shadow-md hover:shadow-lg active:shadow-sm
                  bg-white dark:bg-[#2d2e31] border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-700 dark:text-gray-200
                  transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-200" />
                <span>Create</span>
              </button>
            </div>

            {/* Mini calendar */}
            <div className="mb-4">
              <MiniCalendar />
            </div>

            {/* My Calendars */}
            <div className="px-2 mt-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-2">
                My calendars
              </h3>
              <div className="flex flex-col gap-0.5">
                {myCalendars.map(cal => (
                  <CalendarRow
                    key={cal.id}
                    id={cal.id}
                    name={cal.name}
                    color={cal.color}
                    checked={selectedCalendars[cal.id] !== false}
                    onToggle={() => toggleCalendar(cal.id)}
                  />
                ))}
              </div>
            </div>

            {/* Other Calendars (holidays from API) */}
            {holidayCalendars.length > 0 && (
              <div className="px-2 mt-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 px-2">
                  Other calendars
                </h3>
                <div className="flex flex-col gap-0.5">
                  {holidayCalendars.map(cal => (
                    <CalendarRow
                      key={cal.id}
                      id={cal.id}
                      name={cal.name}
                      color={cal.color}
                      checked={selectedCalendars[cal.id] !== false}
                      onToggle={() => toggleCalendar(cal.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface CalendarRowProps {
  id: string;
  name: string;
  color: string;
  checked: boolean;
  onToggle: () => void;
}

function CalendarRow({ id, name, color, checked, onToggle }: CalendarRowProps) {
  return (
    <label
      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group transition-colors"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className="w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: checked ? color : '#9aa0a6',
            backgroundColor: checked ? color : 'transparent',
          }}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors truncate">
        {name}
      </span>
    </label>
  );
}
