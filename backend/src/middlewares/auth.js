import { authService } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

/** Exige um token JWT válido no cabeçalho Authorization: Bearer <token>. */
export const authenticate = (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Autenticação necessária.', 'NAO_AUTENTICADO'));
  }
  req.user = authService.verify(token);
  return next();
};

export const requireManager = (req, _res, next) =>
  next(req.user?.role === 'GESTOR' ? undefined : new AppError(403, 'Acesso restrito ao gestor.', 'SEM_PERMISSAO'));

export const requireCounter = (req, _res, next) =>
  next(req.user?.counterId ? undefined : new AppError(400, 'Faça login selecionando um guichê para atender.', 'GUICHE_OBRIGATORIO'));
