import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { RegisterInput, LoginInput } from '../schemas/auth';
import { AuthPayload } from '../lib/types';

const BCRYPT_ROUNDS = 12;

const DEFAULT_CALENDARS = [
  { name: 'Personal',          colorId: 'Tomato',   kind: 'user',    readOnly: false },
  { name: 'Work',              colorId: 'Blueberry', kind: 'user',   readOnly: false },
  { name: 'Birthdays',        colorId: 'Lavender',  kind: 'user',   readOnly: false },
  { name: 'Holidays in India', colorId: 'Sage',      kind: 'holiday', country: 'IN', readOnly: true },
];

export function signToken(payload: AuthPayload): string {
  // 7 days in seconds — avoids the StringValue branded-type issue in @types/jsonwebtoken
  const expiresIn = 7 * 24 * 60 * 60;
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hash,
      name: input.name,
      // Seed the three default calendars for every new user.
      calendars: { create: DEFAULT_CALENDARS },
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new AppError(401, 'Invalid credentials');

  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) throw new AppError(401, 'Unauthorized');
  return user;
}
