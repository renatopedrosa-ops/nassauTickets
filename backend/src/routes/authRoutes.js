import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authService } from '../services/authService.js';

export const authRoutes = Router();

authRoutes.post('/login', async (req, res) => {
  res.json(await authService.login(req.body ?? {}));
});

authRoutes.get('/me', authenticate, (req, res) => {
  const { id, name, username, role, counterId, counterName } = req.user;
  res.json({ id, name, username, role, counterId, counterName });
});
