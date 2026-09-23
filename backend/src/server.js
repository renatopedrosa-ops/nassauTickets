import { config } from './config/env.js';
import { createApp } from './app.js';
import { dayCloseService } from './services/dayCloseService.js';

const CLOSE_CHECK_INTERVAL_MS = 60_000;

const closeStaleTickets = () =>
  dayCloseService
    .closeStaleTickets()
    .then(({ discarded, abandoned }) => {
      if (discarded || abandoned) console.log(`[expediente] ${discarded} descartada(s), ${abandoned} abandonada(s).`);
    })
    .catch((error) => console.error('[expediente] falha ao encerrar senhas:', error.code ?? error.message));

createApp().listen(config.port, () => {
  console.log(`nassauTickets API em http://localhost:${config.port}/api (fuso ${config.timezone})`);
  closeStaleTickets();
  setInterval(closeStaleTickets, CLOSE_CHECK_INTERVAL_MS);
});
