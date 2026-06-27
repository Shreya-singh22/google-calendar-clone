'use client';
import { CalendarEvent, DateRange, EventRepository, SaveOptions, DeleteOptions } from './types';

// Thrown by create/update when the server returns 409 overlap.
export class OverlapError extends Error {
  constructor(public conflicts: CalendarEvent[]) {
    super('overlap');
    this.name = 'OverlapError';
  }
}

export class HttpEventRepository implements EventRepository {
  constructor(private baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (res.status === 409) {
      const data = await res.json() as { error: string; conflicts?: CalendarEvent[] };
      if (data.error === 'overlap') throw new OverlapError(data.conflicts ?? []);
      throw Object.assign(new Error(data.error ?? 'Conflict'), { status: 409, data });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error((data as { error?: string }).error ?? `HTTP ${res.status}`), { status: res.status });
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async list(range: DateRange): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({ startUtc: range.startUtc, endUtc: range.endUtc });
    return this.request<CalendarEvent[]>(`/events?${params}`);
  }

  async get(id: string): Promise<CalendarEvent | null> {
    try {
      return await this.request<CalendarEvent>(`/events/${encodeURIComponent(id)}`);
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  async create(
    input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    options?: SaveOptions,
  ): Promise<CalendarEvent> {
    return this.request<CalendarEvent>('/events', {
      method: 'POST',
      body: JSON.stringify({ ...input, override: options?.override }),
    });
  }

  async update(
    id: string,
    patch: Partial<CalendarEvent>,
    options?: SaveOptions,
  ): Promise<CalendarEvent> {
    if (id.startsWith('holiday::')) throw new Error('Holiday events are read-only');
    return this.request<CalendarEvent>(`/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...patch,
        override: options?.override,
        scope: options?.scope,
        expectedUpdatedAt: options?.expectedUpdatedAt,
      }),
    });
  }

  async remove(id: string, options?: DeleteOptions): Promise<void> {
    if (id.startsWith('holiday::')) throw new Error('Holiday events are read-only');
    const params = new URLSearchParams();
    if (options?.scope) params.set('scope', options.scope);
    if (options?.permanent) params.set('permanent', 'true');
    const qs = params.toString() ? `?${params}` : '';
    await this.request<void>(`/events/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
  }

  async search(q: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({ q });
    return this.request<CalendarEvent[]>(`/events/search?${params}`);
  }

  async listTrash(): Promise<CalendarEvent[]> {
    return this.request<CalendarEvent[]>('/events/trash');
  }

  async restore(id: string): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/events/${encodeURIComponent(id)}/restore`, { method: 'POST' });
  }

  async listCalendars(): Promise<Array<{ id: string; name: string; colorId: string; visible: boolean }>> {
    return this.request('/calendars');
  }
}
