import { Router } from 'express';
import { authenticate, requireCounter } from '../middlewares/auth.js';
import { ticketService } from '../services/ticketService.js';

export const attendanceRoutes = Router();
attendanceRoutes.use(authenticate, requireCounter);

const actor = (req) => ({ userId: req.user.id, counterId: req.user.counterId });

attendanceRoutes.get('/current', async (req, res) => {
  const [ticket, queue] = await Promise.all([
    ticketService.current(req.user.counterId),
    ticketService.queueSummary(),
  ]);
  res.json({ ticket, queue });
});

attendanceRoutes.post('/call-next', async (req, res) => res.json(await ticketService.callNext(actor(req))));
attendanceRoutes.post('/recall', async (req, res) => res.json(await ticketService.recall(actor(req))));
attendanceRoutes.post('/start', async (req, res) => res.json(await ticketService.start(actor(req))));
attendanceRoutes.post('/finish', async (req, res) => res.json(await ticketService.finish(actor(req))));
attendanceRoutes.post('/no-show', async (req, res) => res.json(await ticketService.noShow(actor(req))));
