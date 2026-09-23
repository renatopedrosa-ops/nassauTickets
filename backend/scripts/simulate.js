// Simula dias de atendimento para alimentar os relatórios.
// Uso: npm run simulate -- --from 2026-09-01 --to 2026-09-22 --tickets 150
//      npm run simulate -- --days 10     (os últimos 10 dias úteis antes de hoje)
import { parseArgs } from 'node:util';
import { pool } from '../src/db/pool.js';
import { simulationService } from '../src/services/simulationService.js';
import { atTime, toDateKey } from '../src/utils/date.js';

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    to: { type: 'string' },
    days: { type: 'string', default: '5' },
    tickets: { type: 'string', default: '150' },
  },
});

const isSunday = (dateKey) => atTime(dateKey, 12).getDay() === 0;

const buildDates = () => {
  const dates = [];
  if (values.from) {
    const end = values.to ?? values.from;
    for (let d = atTime(values.from, 12); toDateKey(d) <= end; d.setDate(d.getDate() + 1)) dates.push(toDateKey(d));
  } else {
    const cursor = new Date();
    while (dates.length < Number(values.days)) {
      cursor.setDate(cursor.getDate() - 1);
      if (!isSunday(toDateKey(cursor))) dates.unshift(toDateKey(cursor));
    }
  }
  return dates.filter((date) => !isSunday(date));
};

for (const date of buildDates()) {
  // Variação de ±20% na demanda diária deixa os relatórios mais realistas.
  const total = Math.round(Number(values.tickets) * (0.8 + Math.random() * 0.4));
  try {
    const result = await simulationService.simulateDay(date, total);
    console.log(`${date}: ${result.issued} emitidas, ${result.attended} atendidas, ${result.noShow} não compareceram, ${result.discarded} descartadas`);
  } catch (error) {
    console.log(`${date}: ignorado — ${error.message}`);
  }
}
await pool.end();
