import { Request, Response, NextFunction } from 'express';
import { CreateCalendarSchema, UpdateCalendarSchema } from '../schemas/calendar';
import * as calService from '../services/calendarService';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const calendars = await calService.listCalendars(req.user!.userId);
    res.json(calendars);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCalendarSchema.parse(req.body);
    const cal = await calService.createCalendar(req.user!.userId, input);
    res.status(201).json(cal);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateCalendarSchema.parse(req.body);
    const cal = await calService.updateCalendar(req.user!.userId, req.params['id'] as string, input);
    res.json(cal);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await calService.deleteCalendar(req.user!.userId, req.params['id'] as string);
    res.status(204).end();
  } catch (err) { next(err); }
}
