import { CalendarEvent } from '../data/types';

export interface PositionedEvent {
  event: CalendarEvent;
  top: number;       // In pixels
  height: number;    // In pixels
  left: number;      // Percentage 0-100
  width: number;     // Percentage 0-100
}

export const PX_PER_HOUR = 48;
export const MINUTE_HEIGHT = PX_PER_HOUR / 60;

// Parse "HH:mm" from ISO string for local time
export function getMinutesFromMidnight(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Layout algorithm for overlapping events in a single day column.
 * Events are expected to be on the same day.
 */
export function layoutEvents(events: CalendarEvent[]): PositionedEvent[] {
  // Sort events by start time, then by longest duration
  const sorted = [...events].sort((a, b) => {
    const startA = getMinutesFromMidnight(a.startUtc);
    const startB = getMinutesFromMidnight(b.startUtc);
    if (startA !== startB) return startA - startB;
    
    const durationA = getMinutesFromMidnight(a.endUtc) - startA;
    const durationB = getMinutesFromMidnight(b.endUtc) - startB;
    return durationB - durationA;
  });

  const positioned: PositionedEvent[] = [];
  
  // Group into clusters of overlapping events
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = 0;

  for (const event of sorted) {
    const start = getMinutesFromMidnight(event.startUtc);
    const end = getMinutesFromMidnight(event.endUtc);
    
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const columns: CalendarEvent[][] = [];
    
    for (const event of cluster) {
      let placed = false;
      const start = getMinutesFromMidnight(event.startUtc);
      
      for (const col of columns) {
        const lastEventInCol = col[col.length - 1];
        const lastEnd = getMinutesFromMidnight(lastEventInCol.endUtc);
        
        // If this event starts after the last event in the column ends, it can go in this column
        if (start >= lastEnd) {
          col.push(event);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        columns.push([event]);
      }
    }
    
    // Calculate final layout positions
    const numColumns = columns.length;
    
    columns.forEach((col, colIndex) => {
      col.forEach(event => {
        const start = getMinutesFromMidnight(event.startUtc);
        let end = getMinutesFromMidnight(event.endUtc);
        
        // Enforce minimum 15 min visually
        if (end - start < 15) end = start + 15;
        
        const top = start * MINUTE_HEIGHT;
        const height = (end - start) * MINUTE_HEIGHT;
        
        positioned.push({
          event,
          top,
          height,
          left: (colIndex / numColumns) * 100,
          width: (1 / numColumns) * 100,
        });
      });
    });
  }

  return positioned;
}
