import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import calendarRouter from './routes/calendars';
import eventRouter from './routes/events';

const app = express();

// ── CORS — must allow credentials for httpOnly cookies ──────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── Rate limit auth routes ───────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/auth', authLimiter, authRouter);

// ── Resource routes ──────────────────────────────────────────────────────────
app.use('/calendars', calendarRouter);
app.use('/events', eventRouter);

// ── Central error handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
