import { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from '../schemas/auth';
import * as authService from '../services/authService';

const COOKIE_NAME = 'token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterSchema.parse(req.body);
    const user = await authService.register(input);
    const token = authService.signToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const user = await authService.login(input);
    const token = authService.signToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
