'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useCalendarStore } from '@/store';
import { useEventRepository } from '@/lib/data/useEventRepository';
import { CalendarEvent } from '@/lib/data/types';
import {
  format, startOfWeek, endOfWeek, startOfDay, endOfDay,
  addDays, isSameDay, addMinutes
} from 'date-fns';
import { layoutEvents, PX_PER_HOUR, MINUTE_HEIGHT } from '@/lib/layout/layoutEvents';
import { EventChip } from '@/components/events/EventChip';
import { CurrentTimeLine } from './CurrentTimeLine';
import { snapToQuarterHour } from '@/lib/time/utils';

// --- Drag state types ---
type DragType = 'create' | 'move' | 'resize-top' | 'resize-bottom';

interface DragState {
  type: DragType;
  eventId?: string;
  dayIndex: number;
  startMinute: number;
  currentMinute: number;
  originalStartMinute?: number;
  originalEndMinute?: number;
  originalDayIndex?: number;
  ghost?: { startMinute: number; endMinute: number; dayIndex: number };
}

interface WeekDayViewProps {
  onEventClick: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  onCreateRequest: (date: Date, anchor: { x: number; y: number }) => void;
  onEventUpdate: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  events: CalendarEvent[];
  onEventsChange: () => void;
  weekStartsOn?: 0 | 1;
  showWeekends?: boolean;
}

export function WeekDayView({
  onEventClick,
  onCreateRequest,
  onEventUpdate,
  events,
  onEventsChange,
  weekStartsOn = 0,
  showWeekends = true,
}: WeekDayViewProps) {
  const { currentDate, view, selectedCalendars } = useCalendarStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dateObj = new Date(currentDate);
  const isWeek = view === 'week';

  const rangeStart = isWeek ? startOfWeek(dateObj, { weekStartsOn }) : startOfDay(dateObj);
  const rangeEnd = isWeek ? endOfWeek(dateObj, { weekStartsOn }) : endOfDay(dateObj);

  const days = useMemo(() => {
    const d = [];
    const numDays = isWeek ? 7 : 1;
    for (let i = 0; i < numDays; i++) {
      d.push(addDays(rangeStart, i));
    }
    // In week view, optionally hide weekends (day 0 = Sunday, day 6 = Saturday)
    if (isWeek && !showWeekends) {
      return d.filter(day => day.getDay() !== 0 && day.getDay() !== 6);
    }
    return d;
  }, [rangeStart.toISOString(), isWeek, showWeekends]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Auto-scroll to 8 AM on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * PX_PER_HOUR - 20;
    }
  }, []);

  // Group events by day
  const { allDayEvents, timedEventsByDay } = useMemo(() => {
    const allDay: CalendarEvent[] = [];
    const timedByDay: Record<string, CalendarEvent[]> = {};
    days.forEach(d => { timedByDay[d.toISOString()] = []; });

    const filteredEvents = events.filter(e => selectedCalendars[e.calendarId] !== false);

    filteredEvents.forEach(event => {
      if (event.allDay) {
        allDay.push(event);
      } else {
        days.forEach(day => {
          const dayStart = startOfDay(day).toISOString();
          const dayEnd = endOfDay(day).toISOString();
          if (event.startUtc < dayEnd && event.endUtc > dayStart) {
            timedByDay[day.toISOString()].push(event);
          }
        });
      }
    });
    return { allDayEvents: allDay, timedEventsByDay: timedByDay };
  }, [events, days, selectedCalendars]);

  // --- Pointer/Grid helpers ---
  const getMinuteAndDayFromPointer = useCallback((e: PointerEvent | React.PointerEvent): { minute: number; dayIndex: number } | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    const colWidth = rect.width / days.length;
    const dayIndex = Math.max(0, Math.min(days.length - 1, Math.floor(x / colWidth)));
    const minute = snapToQuarterHour(Math.max(0, Math.min(1439, Math.round(y / MINUTE_HEIGHT))));
    return { minute, dayIndex };
  }, [days.length]);

  // --- Pointer Events for drag-to-create on empty space ---
  const handleGridPointerDown = useCallback((e: React.PointerEvent, dayIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-event-chip]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getMinuteAndDayFromPointer(e);
    if (!pos) return;
    const state: DragState = {
      type: 'create',
      dayIndex,
      startMinute: pos.minute,
      currentMinute: pos.minute,
      ghost: { startMinute: pos.minute, endMinute: pos.minute + 60, dayIndex },
    };
    dragRef.current = state;
    setDrag(state);
  }, [getMinuteAndDayFromPointer]);

  const handleGridPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const pos = getMinuteAndDayFromPointer(e);
    if (!pos) return;
    const d = dragRef.current;

    let updated: DragState;
    if (d.type === 'create') {
      const start = Math.min(d.startMinute, pos.minute);
      const end = Math.max(d.startMinute, pos.minute) + 15;
      updated = { ...d, currentMinute: pos.minute, ghost: { startMinute: start, endMinute: end, dayIndex: d.dayIndex } };
    } else if (d.type === 'move') {
      const delta = pos.minute - d.startMinute;
      const origStart = d.originalStartMinute ?? 0;
      const origEnd = d.originalEndMinute ?? 60;
      const duration = origEnd - origStart;
      const newStart = snapToQuarterHour(Math.max(0, Math.min(24 * 60 - duration, origStart + delta)));
      updated = { ...d, currentMinute: pos.minute, ghost: { startMinute: newStart, endMinute: newStart + duration, dayIndex: pos.dayIndex } };
    } else if (d.type === 'resize-bottom') {
      const newEnd = Math.max((d.originalStartMinute ?? 0) + 15, pos.minute);
      updated = { ...d, currentMinute: pos.minute, ghost: { startMinute: d.originalStartMinute ?? 0, endMinute: newEnd, dayIndex: d.dayIndex } };
    } else if (d.type === 'resize-top') {
      const newStart = Math.min((d.originalEndMinute ?? 60) - 15, pos.minute);
      updated = { ...d, currentMinute: pos.minute, ghost: { startMinute: newStart, endMinute: d.originalEndMinute ?? 60, dayIndex: d.dayIndex } };
    } else {
      return;
    }
    dragRef.current = updated;
    setDrag(updated);
  }, [getMinuteAndDayFromPointer]);

  const handleGridPointerUp = useCallback(async (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !d.ghost) { setDrag(null); dragRef.current = null; return; }

    const ghost = d.ghost;
    const day = days[ghost.dayIndex];

    if (d.type === 'create') {
      if (ghost.endMinute - ghost.startMinute >= 15) {
        const baseDate = startOfDay(day);
        const startDate = addMinutes(baseDate, ghost.startMinute);
        const rect = gridRef.current?.getBoundingClientRect();
        const anchor = rect ? { x: rect.left + rect.width / 2, y: e.clientY } : { x: e.clientX, y: e.clientY };
        onCreateRequest(startDate, anchor);
      }
    } else if (d.type === 'move' && d.eventId) {
      const baseDate = startOfDay(day);
      const newStart = addMinutes(baseDate, ghost.startMinute);
      const newEnd = addMinutes(baseDate, ghost.endMinute);
      await onEventUpdate(d.eventId, { startUtc: newStart.toISOString(), endUtc: newEnd.toISOString() });
      onEventsChange();
    } else if ((d.type === 'resize-bottom' || d.type === 'resize-top') && d.eventId) {
      const baseDate = startOfDay(day);
      const newStart = addMinutes(baseDate, ghost.startMinute);
      const newEnd = addMinutes(baseDate, ghost.endMinute);
      await onEventUpdate(d.eventId, { startUtc: newStart.toISOString(), endUtc: newEnd.toISOString() });
      onEventsChange();
    }

    setDrag(null);
    dragRef.current = null;
  }, [days, onCreateRequest, onEventUpdate, onEventsChange]);

  const handleEventPointerDown = useCallback((e: React.PointerEvent, event: CalendarEvent, type: 'move' | 'resize-top' | 'resize-bottom') => {
    if (event.readOnly) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const startDate = new Date(event.startUtc);
    const endDate = new Date(event.endUtc);
    const origStart = startDate.getHours() * 60 + startDate.getMinutes();
    const origEnd = endDate.getHours() * 60 + endDate.getMinutes();

    const dayIndex = days.findIndex(d => isSameDay(d, startDate));
    const pos = getMinuteAndDayFromPointer(e);

    const state: DragState = {
      type,
      eventId: event.id,
      dayIndex: dayIndex < 0 ? 0 : dayIndex,
      startMinute: pos?.minute ?? origStart,
      currentMinute: pos?.minute ?? origStart,
      originalStartMinute: origStart,
      originalEndMinute: origEnd,
      originalDayIndex: dayIndex < 0 ? 0 : dayIndex,
      ghost: { startMinute: origStart, endMinute: origEnd, dayIndex: dayIndex < 0 ? 0 : dayIndex },
    };
    dragRef.current = state;
    setDrag(state);
  }, [days, getMinuteAndDayFromPointer]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-white dark:bg-[#202124] select-none">
      {/* Day Header Row */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 ml-14 shrink-0">
        {days.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3 border-l border-gray-100 dark:border-gray-800 min-w-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {format(day, 'EEE')}
            </span>
            <button
              onClick={() => { useCalendarStore.getState().setCurrentDate(day.toISOString()); useCalendarStore.getState().setView('day'); }}
              className={`text-2xl mt-1 w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
                isSameDay(day, new Date())
                  ? 'bg-blue-600 text-white font-normal'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {format(day, 'd')}
            </button>
          </div>
        ))}
      </div>

      {/* All-Day Row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="w-14 flex items-center justify-end pr-2">
            <span className="text-[10px] text-gray-400">all-day</span>
          </div>
          {days.map((day, i) => (
            <div key={i} className="flex-1 border-l border-gray-100 dark:border-gray-800 p-1 flex flex-col gap-0.5 min-w-0 min-h-[32px]">
              {allDayEvents
                .filter(e => e.startUtc < endOfDay(day).toISOString() && e.endUtc > startOfDay(day).toISOString())
                .map(e => (
                  <EventChip
                    key={e.id}
                    event={e}
                    isAllDay
                    onClick={(ev) => onEventClick(e, { x: ev.clientX, y: ev.clientY })}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Time Grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex"
      >
        {/* Time Gutter */}
        <div className="w-14 shrink-0 relative bg-white dark:bg-[#202124] z-10">
          {hours.map(hour => (
            <div
              key={hour}
              className="relative text-[10px] text-gray-400 font-medium"
              style={{ height: `${PX_PER_HOUR}px` }}
            >
              {hour > 0 && (
                <span className="absolute -top-2 right-2 whitespace-nowrap">
                  {format(new Date(2020, 0, 1, hour), 'h a')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Grid Columns */}
        <div
          ref={gridRef}
          className="flex flex-1 relative cursor-crosshair"
          style={{ height: `${24 * PX_PER_HOUR}px` }}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
        >
          {/* Horizontal Hour Lines */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {hours.map(hour => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                style={{ top: `${hour * PX_PER_HOUR}px` }}
              />
            ))}
            {/* Half-hour lines */}
            {hours.map(hour => (
              <div
                key={`h${hour}`}
                className="absolute left-0 right-0 border-t border-gray-50 dark:border-gray-900"
                style={{ top: `${hour * PX_PER_HOUR + PX_PER_HOUR / 2}px` }}
              />
            ))}
          </div>

          {/* Day Columns */}
          {days.map((day, dayIndex) => {
            const dayKey = day.toISOString();
            const isDraggingThisDay = drag?.ghost?.dayIndex === dayIndex;
            const positioned = layoutEvents(
              timedEventsByDay[dayKey]?.filter(e => !drag || drag.type !== 'move' || drag.eventId !== e.id) ?? []
            );

            return (
              <div
                key={dayIndex}
                className="flex-1 relative border-l border-gray-100 dark:border-gray-800 min-w-0"
                onPointerDown={(e) => handleGridPointerDown(e, dayIndex)}
              >
                <CurrentTimeLine date={day} />

                {/* Positioned timed events */}
                {positioned.map(pos => {
                  const isBeingDragged = drag?.eventId === pos.event.id && (drag.type === 'move' || drag.type === 'resize-top' || drag.type === 'resize-bottom');

                  return (
                    <div
                      key={pos.event.id}
                      data-event-chip="true"
                      style={{
                        position: 'absolute',
                        top: `${pos.top}px`,
                        height: `${pos.height}px`,
                        left: `${pos.left}%`,
                        width: `calc(${pos.width}% - 2px)`,
                        opacity: isBeingDragged ? 0.3 : 1,
                        transition: 'opacity 0.1s',
                        zIndex: isBeingDragged ? 1 : 2,
                      }}
                    >
                      {/* Top resize handle */}
                      {!pos.event.readOnly && (
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize z-10 opacity-0 hover:opacity-100 group-hover:opacity-100"
                          onPointerDown={(e) => handleEventPointerDown(e, pos.event, 'resize-top')}
                        >
                          <div className="h-1 w-8 mx-auto bg-white/70 rounded-full mt-0.5" />
                        </div>
                      )}

                      {/* Event body */}
                      <EventChip
                        event={pos.event}
                        style={{ position: 'absolute', inset: 0, cursor: 'grab' }}
                        onClick={(e) => { if (!dragRef.current) onEventClick(pos.event, { x: e.clientX, y: e.clientY }); }}
                        className="group"
                      />

                      {/* Drag handle overlay on body */}
                      <div
                        className="absolute inset-0 z-5 cursor-grab"
                        onPointerDown={(e) => handleEventPointerDown(e, pos.event, 'move')}
                        style={{ top: '8px', bottom: '8px' }}
                      />

                      {/* Bottom resize handle */}
                      {!pos.event.readOnly && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-10"
                          onPointerDown={(e) => handleEventPointerDown(e, pos.event, 'resize-bottom')}
                        >
                          <div className="h-1 w-8 mx-auto bg-white/70 rounded-full mb-0.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Drag ghost */}
                {drag?.ghost && drag.ghost.dayIndex === dayIndex && (
                  <DragGhost
                    ghost={drag.ghost}
                    eventId={drag.type !== 'create' ? drag.eventId : undefined}
                    events={events}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Ghost event rendered during drag ---
interface GhostProps {
  ghost: { startMinute: number; endMinute: number; dayIndex: number };
  eventId?: string;
  events: CalendarEvent[];
}

function DragGhost({ ghost, eventId, events }: GhostProps) {
  const event = eventId ? events.find(e => e.id === eventId) : undefined;
  const top = ghost.startMinute * MINUTE_HEIGHT;
  const height = Math.max(15, ghost.endMinute - ghost.startMinute) * MINUTE_HEIGHT;
  const startHour = Math.floor(ghost.startMinute / 60);
  const startMin = ghost.startMinute % 60;
  const endHour = Math.floor(ghost.endMinute / 60);
  const endMin = ghost.endMinute % 60;
  const fmt = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;

  return (
    <div
      className="absolute left-1 right-1 rounded-md z-20 pointer-events-none overflow-hidden"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: '#1a73e8',
        opacity: 0.85,
        border: '2px solid white',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      <div className="px-2 py-1 text-white text-xs font-medium truncate">
        {event?.title || 'New event'}
      </div>
      <div className="px-2 text-white/80 text-[10px]">
        {fmt(startHour, startMin)} – {fmt(endHour, endMin)}
      </div>
    </div>
  );
}
