import { Request, Response, NextFunction } from 'express';
import { CreateEventSchema, UpdateEventSchema, ListEventsQuerySchema } from '../schemas/event';
import * as eventService from '../services/eventService';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { startUtc, endUtc } = ListEventsQuerySchema.parse(req.query);
    const events = await eventService.listEvents(req.user!.userId, startUtc, endUtc);
    res.json(events);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const ev = await eventService.getEvent(req.user!.userId, req.params['id'] as string);
    if (!ev) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json(ev);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateEventSchema.parse(req.body);
    const ev = await eventService.createEvent(req.user!.userId, input);
    res.status(201).json(ev);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateEventSchema.parse(req.body);
    const ev = await eventService.updateEvent(req.user!.userId, req.params['id'] as string, input);
    res.json(ev);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const scope = (req.query['scope'] as 'single' | 'following' | 'all') ?? 'all';
    const permanent = req.query['permanent'] === 'true';
    await eventService.deleteEvent(req.user!.userId, req.params['id'] as string, scope, permanent);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query['q'] as string ?? '').trim();
    if (!q) { res.json([]); return; }
    const events = await eventService.searchEvents(req.user!.userId, q);
    res.json(events);
  } catch (err) { next(err); }
}

export async function listTrash(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await eventService.listTrash(req.user!.userId);
    res.json(events);
  } catch (err) { next(err); }
}

export async function restore(req: Request, res: Response, next: NextFunction) {
  try {
    const ev = await eventService.restoreEvent(req.user!.userId, req.params['id'] as string);
    res.json(ev);
  } catch (err) { next(err); }
}
