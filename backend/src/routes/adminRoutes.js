import { Router } from 'express';
import { authenticate, requireManager } from '../middlewares/auth.js';
import { adminService } from '../services/adminService.js';
import { dayCloseService } from '../services/dayCloseService.js';
import { reportService } from '../services/reportService.js';
import { simulationService } from '../services/simulationService.js';
import { AppError } from '../utils/AppError.js';
import { now } from '../utils/clock.js';
import { isValidDateKey, isValidMonthKey, monthRange, toDateKey } from '../utils/date.js';

export const adminRoutes = Router();
adminRoutes.use(authenticate, requireManager);

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Identificador inválido.', 'ID_INVALIDO');
  return id;
};

// Cadastros (RF12/RF13)
adminRoutes.get('/users', async (_req, res) => res.json(await adminService.listUsers()));
adminRoutes.post('/users', async (req, res) => res.status(201).json(await adminService.createUser(req.body ?? {})));
adminRoutes.patch('/users/:id', async (req, res) =>
  res.json(await adminService.updateUser(idParam(req), req.body ?? {}, req.user.id)));

adminRoutes.get('/counters', async (_req, res) => res.json(await adminService.listCounters()));
adminRoutes.post('/counters', async (req, res) => res.status(201).json(await adminService.createCounter(req.body ?? {})));
adminRoutes.patch('/counters/:id', async (req, res) =>
  res.json(await adminService.updateCounter(idParam(req), req.body ?? {})));

// Relatórios (RF14)
adminRoutes.get('/reports/daily', async (req, res) => {
  const date = req.query.date ?? toDateKey(now());
  if (!isValidDateKey(date)) throw new AppError(400, 'Data inválida. Use AAAA-MM-DD.', 'DATA_INVALIDA');
  res.json(await reportService.daily(date));
});

adminRoutes.get('/reports/monthly', async (req, res) => {
  const month = req.query.month ?? toDateKey(now()).slice(0, 7);
  if (!isValidMonthKey(month)) throw new AppError(400, 'Mês inválido. Use AAAA-MM.', 'MES_INVALIDO');
  res.json(await reportService.monthly({ month, ...monthRange(month) }));
});

// Operações do expediente
adminRoutes.post('/close-day', async (_req, res) => res.json(await dayCloseService.closeStaleTickets()));

adminRoutes.post('/simulate', async (req, res) => {
  const { date, tickets = 150 } = req.body ?? {};
  if (!isValidDateKey(date)) throw new AppError(400, 'Data inválida. Use AAAA-MM-DD.', 'DATA_INVALIDA');
  res.status(201).json(await simulationService.simulateDay(date, Number(tickets)));
});
