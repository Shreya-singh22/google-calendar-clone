export const CALENDAR_COLORS = {
  Tomato: '#d50000',
  Flamingo: '#e67c73',
  Tangerine: '#f4511e',
  Banana: '#f6bf26',
  Sage: '#33b679',
  Basil: '#0b8043',
  Peacock: '#039be5',
  Blueberry: '#3f51b5',
  Lavender: '#7986cb',
  Grape: '#8e24aa',
  Graphite: '#616161',
} as const;

export type ColorId = keyof typeof CALENDAR_COLORS;
