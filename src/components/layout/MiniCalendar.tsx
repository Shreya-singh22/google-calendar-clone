'use client';

import { useCalendarStore } from '@/store';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MiniCalendar() {
  const { currentDate, setCurrentDate } = useCalendarStore();
  const dateObj = new Date(currentDate);

  // Local state for navigating the mini calendar independently.
  // Sync to currentDate when the store changes month (e.g. TopBar navigation).
  const [viewDate, setViewDate] = useState(dateObj);

  useEffect(() => {
    setViewDate(new Date(currentDate));
  }, [currentDate]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  return (
    <div className="w-full max-w-[250px] px-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <div className="flex">
          <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-y-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs text-gray-500 font-medium w-8 h-8 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isSelected = isSameDay(day, dateObj);
          const isDayToday = isToday(day);

          let className = "text-xs w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ";
          
          if (isSelected) {
            className += "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium ";
          } else if (isDayToday) {
            className += "bg-blue-600 text-white font-medium ";
          } else if (!isCurrentMonth) {
            className += "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 ";
          } else {
            className += "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ";
          }

          return (
            <button
              key={i}
              onClick={() => setCurrentDate(day.toISOString())}
              className={className}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
