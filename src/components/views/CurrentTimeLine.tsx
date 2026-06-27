'use client';

import { useEffect, useState } from 'react';
import { PX_PER_HOUR, MINUTE_HEIGHT } from '@/lib/layout/layoutEvents';
import { isToday } from 'date-fns';

export function CurrentTimeLine({ date }: { date: Date }) {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!isToday(date)) return;

    const interval = setInterval(() => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000); // update every minute

    return () => clearInterval(interval);
  }, [date]);

  if (!isToday(date)) return null;

  const top = minutes * MINUTE_HEIGHT;

  return (
    <div 
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="absolute left-0 w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute left-0 right-0 h-[2px] bg-red-500 -translate-y-1/2 shadow-sm" />
    </div>
  );
}
