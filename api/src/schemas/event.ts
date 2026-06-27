import { z } from 'zod';

const isoUtc = z.string().datetime({ offset: true });

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startUtc: isoUtc,
  endUtc: isoUtc,
  allDay: z.boolean(),
  colorId: z.string().min(1),
  calendarId: z.string().min(1),
  rrule: z.string().optional().nullable(),
  recurringEventId: z.string().optional().nullable(),
  override: z.boolean().optional(), // client sets true to force-save despite overlap
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  startUtc: isoUtc.optional(),
  endUtc: isoUtc.optional(),
  allDay: z.boolean().optional(),
  colorId: z.string().optional(),
  calendarId: z.string().optional(),
  rrule: z.string().optional().nullable(),
  recurringEventId: z.string().optional().nullable(),
  override: z.boolean().optional(),
  // Optimistic concurrency: client sends the updatedAt it last saw.
  expectedUpdatedAt: isoUtc.optional(),
  // Recurring edit scope
  scope: z.enum(['single', 'following', 'all']).optional(),
});

export const ListEventsQuerySchema = z.object({
  startUtc: isoUtc,
  endUtc: isoUtc,
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
