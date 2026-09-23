import { AppError } from '../utils/AppError.js';

const DB_UNAVAILABLE = new Set(['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ETIMEDOUT', 'ER_BAD_DB_ERROR']);

export const notFound = (_req, _res, next) => next(new AppError(404, 'Rota não encontrada.', 'ROTA_NAO_ENCONTRADA'));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.code, message: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON_INVALIDO', message: 'Corpo da requisição inválido.' });
  }
  if (DB_UNAVAILABLE.has(error.code)) {
    // Disponibilidade (RNF04): o frontend reconhece o 503 e entra em modo "sem conexão".
    return res.status(503).json({ error: 'BANCO_INDISPONIVEL', message: 'Banco de dados indisponível. Tente novamente em instantes.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'ERRO_INTERNO', message: 'Erro interno do servidor.' });
};
