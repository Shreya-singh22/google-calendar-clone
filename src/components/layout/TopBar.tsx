'use client';

import { useCalendarStore, CalendarView } from '@/store';
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  isSameMonth, endOfWeek, startOfWeek
} from 'date-fns';
import {
  Menu, ChevronLeft, ChevronRight, Search, Settings, HelpCircle, LogOut,
  Trash2, Sun, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

interface TopBarProps {
  onCreateClick?: () => void;
  onSearchOpen?: () => void;
  onHelpOpen?: () => void;
  onTrashOpen?: () => void;
  onSettingsOpen?: () => void;
  onAppearanceOpen?: () => void;
  onPrintClick?: () => void;
}

export function TopBar({
  onCreateClick,
  onSearchOpen,
  onHelpOpen,
  onTrashOpen,
  onSettingsOpen,
  onAppearanceOpen,
  onPrintClick,
}: TopBarProps) {
  const { toggleSidebar, setSidebarOpen, currentDate, view, setView, setCurrentDate } = useCalendarStore();
  const closeSidebarOnMobile = () => { if (window.innerWidth < 768) setSidebarOpen(false); };
  const { user, logout } = useAuthStore();
  const dateObj = new Date(currentDate);

  const [viewMenuOpen, setViewMenuOpen]     = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  const viewMenuRef     = useRef<HTMLDivElement>(null);
  const avatarMenuRef   = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClose(viewMenuRef,     viewMenuOpen,     () => setViewMenuOpen(false));
  useOutsideClose(avatarMenuRef,   avatarMenuOpen,   () => setAvatarMenuOpen(false));
  useOutsideClose(settingsMenuRef, settingsMenuOpen, () => setSettingsMenuOpen(false));

  const navigateToday = () => setCurrentDate(new Date().toISOString());

  const navigatePrev = () => {
    let d: Date;
    if (view === 'month') d = subMonths(dateObj, 1);
    else if (view === 'week') d = subWeeks(dateObj, 1);
    else d = subDays(dateObj, 1);
    setCurrentDate(d.toISOString());
  };

  const navigateNext = () => {
    let d: Date;
    if (view === 'month') d = addMonths(dateObj, 1);
    else if (view === 'week') d = addWeeks(dateObj, 1);
    else d = addDays(dateObj, 1);
    setCurrentDate(d.toISOString());
  };

  const getPeriodLabel = () => {
    if (view === 'month') return format(dateObj, 'MMMM yyyy');
    if (view === 'week') {
      const start = startOfWeek(dateObj);
      const end   = endOfWeek(dateObj);
      if (isSameMonth(start, end)) return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(dateObj, 'MMMM d, yyyy');
  };

  const viewLabels: Record<CalendarView, string> = { day: 'Day', week: 'Week', month: 'Month' };

  // Keyboard: / → search, ? → help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); onSearchOpen?.(); }
      if (e.key === '?') { onHelpOpen?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearchOpen, onHelpOpen]);

  return (
    <header className="flex items-center justify-between px-3 h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#202124] shrink-0 z-30 gap-2">
      {/* Left cluster */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 select-none ml-1">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="4" width="28" height="28" rx="5" fill="white" stroke="#dadce0" strokeWidth="1.5"/>
            <rect x="4" y="10" width="28" height="6" fill="#1a73e8"/>
            <rect x="4" y="4" width="28" height="6" rx="3" fill="#1a73e8"/>
            <text x="18" y="30" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#3c4043" fontFamily="Arial">
              {format(new Date(), 'd')}
            </text>
          </svg>
          <span className="text-[22px] font-light text-gray-700 dark:text-gray-200 tracking-tight hidden sm:block">
            Calendar
          </span>
        </div>
      </div>

      {/* Center cluster */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <button
          type="button"
          onClick={navigateToday}
          className="px-4 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          Today
        </button>

        <button type="button" onClick={navigatePrev} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Previous">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button type="button" onClick={navigateNext} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Next">
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <AnimatePresence mode="wait">
          <motion.span
            key={getPeriodLabel()}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.15 }}
            className="text-lg font-normal text-gray-800 dark:text-gray-100 ml-2 truncate hidden sm:block"
          >
            {getPeriodLabel()}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Search  (/)"
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Help */}
        <button
          type="button"
          onClick={onHelpOpen}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Keyboard shortcuts  (?)"
        >
          <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Settings gear → dropdown */}
        <div className="relative" ref={settingsMenuRef}>
          <button
            type="button"
            onClick={() => setSettingsMenuOpen(v => !v)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <AnimatePresence>
            {settingsMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 bg-white dark:bg-[#2d2e31] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 min-w-[200px]"
              >
                <SettingsMenuItem
                  icon={<Settings className="w-4 h-4" />}
                  label="Preferences"
                  onClick={() => { setSettingsMenuOpen(false); onSettingsOpen?.(); }}
                />
                <SettingsMenuItem
                  icon={<Sun className="w-4 h-4" />}
                  label="Appearance"
                  onClick={() => { setSettingsMenuOpen(false); onAppearanceOpen?.(); }}
                />
                <SettingsMenuItem
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Trash"
                  onClick={() => { setSettingsMenuOpen(false); onTrashOpen?.(); }}
                />
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <SettingsMenuItem
                  icon={<Printer className="w-4 h-4" />}
                  label="Print"
                  onClick={() => { setSettingsMenuOpen(false); onPrintClick?.(); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View switcher dropdown */}
        <div className="relative ml-1" ref={viewMenuRef}>
          <button
            type="button"
            onClick={() => setViewMenuOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {viewLabels[view]}
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${viewMenuOpen ? 'rotate-90' : '-rotate-90'}`} />
          </button>

          <AnimatePresence>
            {viewMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 bg-white dark:bg-[#2d2e31] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 min-w-[120px]"
              >
                {(['day', 'week', 'month'] as CalendarView[]).map(v => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => { setView(v); setViewMenuOpen(false); closeSidebarOnMobile(); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${view === v
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {viewLabels[v]}
                    <span className="ml-2 text-gray-400 text-xs">{v[0].toUpperCase()}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar / user menu */}
        <div className="relative ml-2" ref={avatarMenuRef}>
          <button
            type="button"
            onClick={() => setAvatarMenuOpen(v => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-medium shrink-0 shadow-sm hover:opacity-90 transition-opacity"
            title={user ? (user.name ?? user.email) : 'Account'}
          >
            {user ? (user.name ?? user.email).charAt(0).toUpperCase() : 'S'}
          </button>
          <AnimatePresence>
            {avatarMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 bg-white dark:bg-[#2d2e31] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 min-w-[200px]"
              >
                {user && (
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.name ?? 'User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { logout(); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function SettingsMenuItem({
  icon, label, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      {label}
    </button>
  );
}

function useOutsideClose(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  close: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, close, ref]);
}
