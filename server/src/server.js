import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { pathToFileURL } from 'node:url';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import habitsRoutes from './routes/habits.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'HabitPulseAI API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/habits', requireAuth, habitsRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/ai', requireAuth, aiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: err.message || 'Something went wrong.' });
});

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`HabitPulseAI API running on http://localhost:${env.port}`);
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}

export { app };
