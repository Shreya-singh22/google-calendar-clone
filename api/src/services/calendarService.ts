import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateCalendarInput, UpdateCalendarInput } from '../schemas/calendar';

export async function listCalendars(userId: string) {
  return prisma.calendar.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createCalendar(userId: string, input: CreateCalendarInput) {
  return prisma.calendar.create({
    data: { ...input, userId },
  });
}

export async function updateCalendar(userId: string, id: string, input: UpdateCalendarInput) {
  const cal = await prisma.calendar.findFirst({ where: { id, userId } });
  if (!cal) throw new AppError(404, 'Calendar not found');

  return prisma.calendar.update({ where: { id }, data: input });
}

export async function deleteCalendar(userId: string, id: string) {
  const cal = await prisma.calendar.findFirst({ where: { id, userId } });
  if (!cal) throw new AppError(404, 'Calendar not found');

  // Cascade: Prisma schema has onDelete: Cascade on Event.calendar,
  // so deleting the calendar removes all its events automatically.
  await prisma.calendar.delete({ where: { id } });
}
