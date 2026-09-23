import { Router } from 'express';
import { checkDatabase } from '../db/pool.js';
import { adminService } from '../services/adminService.js';
import { ticketService } from '../services/ticketService.js';
import { now } from '../utils/clock.js';

export const publicRoutes = Router();

// Estado do backend e do banco, usado pelo frontend para exibir "sem conexão" (RNF04).
publicRoutes.get('/health', async (_req, res) => {
  const database = await checkDatabase().catch(() => false);
  res.status(database ? 200 : 503).json({ api: 'ok', database: database ? 'ok' : 'indisponivel', time: now() });
});

// Totem: emissão anônima de senha (RF01).
publicRoutes.post('/tickets', async (req, res) => {
  res.status(201).json(await ticketService.issue(req.body?.type));
});

// Painel: 5 últimas chamadas (RF10).
publicRoutes.get('/panel', async (_req, res) => {
  res.json(await ticketService.panel());
});

// Guichês ativos para a tela de login.
publicRoutes.get('/counters', async (_req, res) => {
  res.json(await adminService.listCounters(true));
});
