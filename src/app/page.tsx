'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCalendarListStore } from '@/store/calendarListStore';
import { useCalendarStore } from '@/store';

const CalendarApp = dynamic(() => import('@/components/CalendarApp'), { ssr: false });
const AuthPage = dynamic(() => import('@/components/auth/AuthPage'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const { user, bootstrapped, bootstrap } = useAuthStore();
  const { loadCalendars } = useCalendarListStore();
  const { initCalendars } = useCalendarStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Load real calendar IDs right after the user session is confirmed.
  // Guarantees EventEditor always has real IDs before it can open.
  useEffect(() => {
    if (!API_URL || !user) return;
    loadCalendars().then(() => {
      const ids = useCalendarListStore.getState().calendars.map(c => c.id);
      if (ids.length > 0) initCalendars(ids);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!API_URL) return <CalendarApp />;
  if (!bootstrapped) return null;
  if (user) return <CalendarApp />;
  return <AuthPage />;
}
