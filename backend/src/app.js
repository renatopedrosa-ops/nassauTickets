import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { attendanceRoutes } from './routes/attendanceRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { publicRoutes } from './routes/publicRoutes.js';

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
