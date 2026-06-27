'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCalendarListStore } from '@/store/calendarListStore';
import { useCalendarStore } from '@/store';

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-[#202124]">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const CalendarApp = dynamic(() => import('@/components/CalendarApp'), { ssr: false, loading: Spinner });
const AuthPage = dynamic(() => import('@/components/auth/AuthPage'), { ssr: false, loading: Spinner });

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const { user, bootstrapped, bootstrap } = useAuthStore();
  const { loadCalendars } = useCalendarListStore();
  const { initCalendars } = useCalendarStore();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    if (!API_URL || !user) return;
    loadCalendars().then(() => {
      const ids = useCalendarListStore.getState().calendars.map(c => c.id);
      if (ids.length > 0) initCalendars(ids);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!API_URL) return <CalendarApp />;
  if (!bootstrapped) return <Spinner />;
  if (user) return <CalendarApp />;
  return <AuthPage />;
}
