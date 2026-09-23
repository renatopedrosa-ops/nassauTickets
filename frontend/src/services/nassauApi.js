import { request } from './api.js';

// Um objeto por área do sistema, espelhando as rotas do backend.
export const publicApi = {
  health: () => request('/health', { auth: false }),
  issueTicket: (type) => request('/tickets', { method: 'POST', body: { type }, auth: false }),
  panel: () => request('/panel', { auth: false }),
  counters: () => request('/counters', { auth: false }),
};

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials, auth: false }),
  me: () => request('/auth/me'),
};

export const attendanceApi = {
  current: () => request('/attendance/current'),
  callNext: () => request('/attendance/call-next', { method: 'POST' }),
  recall: () => request('/attendance/recall', { method: 'POST' }),
  start: () => request('/attendance/start', { method: 'POST' }),
  finish: () => request('/attendance/finish', { method: 'POST' }),
  noShow: () => request('/attendance/no-show', { method: 'POST' }),
};

export const adminApi = {
  users: () => request('/admin/users'),
  createUser: (user) => request('/admin/users', { method: 'POST', body: user }),
  updateUser: (id, fields) => request(`/admin/users/${id}`, { method: 'PATCH', body: fields }),
  counters: () => request('/admin/counters'),
  createCounter: (counter) => request('/admin/counters', { method: 'POST', body: counter }),
  updateCounter: (id, fields) => request(`/admin/counters/${id}`, { method: 'PATCH', body: fields }),
  dailyReport: (date) => request(`/admin/reports/daily?date=${encodeURIComponent(date)}`),
  monthlyReport: (month) => request(`/admin/reports/monthly?month=${encodeURIComponent(month)}`),
  closeDay: () => request('/admin/close-day', { method: 'POST' }),
  simulate: (date, tickets) => request('/admin/simulate', { method: 'POST', body: { date, tickets } }),
};
