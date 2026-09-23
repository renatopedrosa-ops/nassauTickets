import { pool } from '../db/pool.js';
import { counterRepository } from '../repositories/counterRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../utils/AppError.js';
import { authService } from './authService.js';

const ROLES = ['ATENDENTE', 'GESTOR'];

const validateUser = ({ name, username, password, role }, { creating }) => {
  if (creating && (!name?.trim() || !username?.trim() || !password)) {
    throw new AppError(400, 'Nome, usuário e senha são obrigatórios.', 'DADOS_OBRIGATORIOS');
  }
  if (password !== undefined && String(password).length < 6) {
    throw new AppError(400, 'A senha deve ter ao menos 6 caracteres.', 'SENHA_FRACA');
  }
  if (role !== undefined && !ROLES.includes(role)) {
    throw new AppError(400, 'Perfil inválido.', 'PERFIL_INVALIDO');
  }
};

const translateDuplicate = (error, message) => {
  if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, message, 'DUPLICADO');
  throw error;
};

export const adminService = {
  listUsers: () => userRepository.list(pool),

  async createUser(data) {
    validateUser(data, { creating: true });
    const id = await userRepository
      .insert(pool, {
        name: data.name.trim(),
        username: data.username.trim(),
        password_hash: await authService.hashPassword(data.password),
        role: data.role ?? 'ATENDENTE',
      })
      .catch((error) => translateDuplicate(error, 'Nome de usuário já existe.'));
    return userRepository.findById(pool, id);
  },

  async updateUser(id, data, currentUserId) {
    validateUser(data, { creating: false });
    if (!(await userRepository.findById(pool, id))) throw new AppError(404, 'Usuário não encontrado.', 'NAO_ENCONTRADO');
    if (id === currentUserId && (data.active === false || data.role === 'ATENDENTE')) {
      throw new AppError(409, 'Você não pode desativar nem remover o perfil de gestor do próprio usuário.', 'OPERACAO_NAO_PERMITIDA');
    }
    const fields = {};
    if (data.name !== undefined) fields.name = String(data.name).trim();
    if (data.role !== undefined) fields.role = data.role;
    if (data.active !== undefined) fields.active = Boolean(data.active);
    if (data.password) fields.password_hash = await authService.hashPassword(data.password);
    await userRepository.update(pool, id, fields);
    return userRepository.findById(pool, id);
  },

  listCounters: (onlyActive = false) => counterRepository.list(pool, { onlyActive }),

  async createCounter({ name }) {
    if (!name?.trim()) throw new AppError(400, 'Informe o nome do guichê.', 'DADOS_OBRIGATORIOS');
    const id = await counterRepository
      .insert(pool, { name: name.trim() })
      .catch((error) => translateDuplicate(error, 'Já existe um guichê com esse nome.'));
    return counterRepository.findById(pool, id);
  },

  async updateCounter(id, { name, active }) {
    if (!(await counterRepository.findById(pool, id))) throw new AppError(404, 'Guichê não encontrado.', 'NAO_ENCONTRADO');
    const fields = {};
    if (name !== undefined) fields.name = String(name).trim();
    if (active !== undefined) fields.active = Boolean(active);
    await counterRepository
      .update(pool, id, fields)
      .catch((error) => translateDuplicate(error, 'Já existe um guichê com esse nome.'));
    return counterRepository.findById(pool, id);
  },
};
