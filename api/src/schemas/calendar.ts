import { z } from 'zod';

export const CreateCalendarSchema = z.object({
  name: z.string().min(1).max(100),
  colorId: z.string().min(1),
  visible: z.boolean().optional().default(true),
});

export const UpdateCalendarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  colorId: z.string().min(1).optional(),
  visible: z.boolean().optional(),
});

export type CreateCalendarInput = z.infer<typeof CreateCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof UpdateCalendarSchema>;
