'use client';

import { CalendarEvent } from '@/lib/data/types';
import { CALENDAR_COLORS, ColorId } from '@/lib/colors';
import { format } from 'date-fns';

interface EventChipProps {
  event: CalendarEvent;
  isAllDay?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function EventChip({ event, isAllDay, style, onClick, className = '' }: EventChipProps) {
  const colorHex = CALENDAR_COLORS[event.colorId as ColorId] || CALENDAR_COLORS.Blueberry;

  if (isAllDay || event.allDay) {
    return (
      <div
        data-event-chip="true"
        onClick={onClick}
        className={`px-2 py-0.5 text-[11px] font-medium text-white truncate rounded-sm cursor-pointer select-none
          hover:brightness-90 active:brightness-75 transition-all
          shadow-sm hover:shadow ${className}`}
        style={{ backgroundColor: colorHex, ...style }}
      >
        {event.title}
      </div>
    );
  }

  // Timed event in the time grid
  const start = new Date(event.startUtc);
  const timeStr = format(start, 'h:mm a');
  const isDark = isDarkColor(colorHex);

  return (
    <div
      data-event-chip="true"
      onClick={onClick}
      className={`flex flex-col overflow-hidden rounded-lg border-l-4 cursor-pointer select-none
        transition-all duration-100
        hover:brightness-95 active:brightness-90
        ${className}`}
      style={{
        backgroundColor: hexWithOpacity(colorHex, 0.15),
        borderLeftColor: colorHex,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        boxShadow: `0 1px 3px ${hexWithOpacity(colorHex, 0.2)}`,
        ...style,
      }}
    >
      <div className="px-1.5 pt-1 pb-0.5 min-h-0">
        <div
          className="text-[11px] font-semibold leading-tight truncate"
          style={{ color: colorHex }}
        >
          {event.title}
        </div>
        <div
          className="text-[10px] leading-tight mt-0.5 truncate"
          style={{ color: hexWithOpacity(colorHex, 0.8) }}
        >
          {timeStr}
        </div>
      </div>
    </div>
  );
}

function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
