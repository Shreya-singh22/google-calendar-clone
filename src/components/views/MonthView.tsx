'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCalendarStore } from '@/store';
import { CalendarEvent } from '@/lib/data/types';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfDay, endOfDay
} from 'date-fns';
import { EventChip } from '@/components/events/EventChip';
import { CALENDAR_COLORS, ColorId } from '@/lib/colors';

interface MonthViewProps {
  onEventClick: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  onCreateRequest: (date: Date, anchor: { x: number; y: number }) => void;
  events: CalendarEvent[];
  weekStartsOn?: 0 | 1;
}

export function MonthView({ onEventClick, onCreateRequest, events, weekStartsOn = 0 }: MonthViewProps) {
  const { currentDate, selectedCalendars } = useCalendarStore();
  const dateObj = new Date(currentDate);

  const monthStart = startOfMonth(dateObj);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group events by day, filtering hidden calendars
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    days.forEach(d => { map[d.toISOString()] = []; });

    const filteredEvents = events.filter(e => selectedCalendars[e.calendarId] !== false);

    filteredEvents.forEach(event => {
      days.forEach(day => {
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = endOfDay(day).toISOString();
        if (event.startUtc < dayEnd && event.endUtc > dayStart) {
          map[day.toISOString()].push(event);
        }
      });
    });

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.startUtc.localeCompare(b.startUtc);
      });
    });

    return map;
  }, [events, days, selectedCalendars]);

  const numWeeks = days.length / 7;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-white dark:bg-[#202124]">
      {/* Day-of-week header — rotates based on weekStartsOn */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const)
          .slice(weekStartsOn)
          .concat((['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const).slice(0, weekStartsOn))
          .map((day, i) => (
            <div key={i} className="py-2 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-widest border-l border-gray-200 dark:border-gray-700 first:border-l-0">
              {day}
            </div>
          ))
        }
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
      >
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);
          const isSelected = isSameDay(day, dateObj) && !isDayToday;
          const dayEvents = eventsByDay[day.toISOString()] || [];
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const hiddenCount = dayEvents.length - maxVisible;

          return (
            <div
              key={i}
              onClick={(e) => {
                // Only trigger create if clicking on the cell bg, not a chip
                if ((e.target as HTMLElement).closest('[data-event-chip]')) return;
                onCreateRequest(startOfDay(day), { x: e.clientX, y: e.clientY });
              }}
              className={`border-b border-r border-gray-200 dark:border-gray-700 flex flex-col p-1 min-h-[100px] cursor-pointer group
                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-[#27282b]' : 'bg-white dark:bg-[#202124]'}
                hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors
              `}
            >
              {/* Date number */}
              <div className="flex justify-center mb-1 shrink-0">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors
                  ${isDayToday
                    ? 'bg-blue-600 text-white'
                    : isSelected
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 ring-2 ring-blue-400 dark:ring-blue-500'
                      : !isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-0.5 overflow-hidden min-h-0 flex-1">
                {visibleEvents.map(event => {
                  const colorHex = CALENDAR_COLORS[event.colorId as ColorId] || CALENDAR_COLORS.Blueberry;
                  return (
                    <div
                      key={event.id}
                      data-event-chip="true"
                      onClick={(e) => { e.stopPropagation(); onEventClick(event, { x: e.clientX, y: e.clientY }); }}
                    >
                      {event.allDay ? (
                        <div
                          className="px-1.5 py-0.5 text-[11px] font-medium text-white truncate rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: colorHex }}
                        >
                          {event.title}
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/chip"
                          style={{ color: colorHex }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorHex }} />
                          <span className="text-[11px] font-medium truncate text-gray-700 dark:text-gray-200 group-hover/chip:text-gray-900 dark:group-hover/chip:text-white">
                            {format(new Date(event.startUtc), 'h:mm a')} {event.title}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    {hiddenCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
