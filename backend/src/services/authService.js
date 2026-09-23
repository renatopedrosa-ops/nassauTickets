import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { pool } from '../db/pool.js';
import { counterRepository } from '../repositories/counterRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../utils/AppError.js';

export const authService = {
  /** RF04 — login do atendente com escolha do guichê. */
  async login({ username, password, counterId }) {
    if (!username || !password) {
      throw new AppError(400, 'Informe usuário e senha.', 'DADOS_OBRIGATORIOS');
    }
    const user = await userRepository.findByUsername(pool, String(username).trim());
    const valid = user && user.active && (await bcrypt.compare(String(password), user.password_hash));
    // Mesma mensagem para usuário inexistente ou senha errada: não revela quais usuários existem.
    if (!valid) throw new AppError(401, 'Usuário ou senha inválidos.', 'CREDENCIAIS_INVALIDAS');

    let counter = null;
    if (counterId) {
      counter = await counterRepository.findById(pool, Number(counterId));
      if (!counter?.active) throw new AppError(400, 'Guichê inválido ou inativo.', 'GUICHE_INVALIDO');
    } else if (user.role !== 'GESTOR') {
      throw new AppError(400, 'Selecione o guichê de atendimento.', 'GUICHE_OBRIGATORIO');
    }

    const profile = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      counterId: counter?.id ?? null,
      counterName: counter?.name ?? null,
    };
    const token = jwt.sign(profile, config.jwt.secret, { subject: String(user.id), expiresIn: config.jwt.expiresIn });
    return { token, user: profile };
  },

  verify(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch {
      throw new AppError(401, 'Sessão expirada ou inválida. Faça login novamente.', 'TOKEN_INVALIDO');
    }
  },

  hashPassword: (password) => bcrypt.hash(password, 10),
};
