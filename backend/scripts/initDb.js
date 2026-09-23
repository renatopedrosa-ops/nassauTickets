// Cria o banco, as tabelas e os dados iniciais (guichês e usuários padrão).
// Uso: npm run db:init            (idempotente)
//      npm run db:init -- --reset (APAGA todas as tabelas e recria)
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { config } from '../src/config/env.js';

const TABLES_IN_DROP_ORDER = ['ticket_events', 'tickets', 'call_control', 'ticket_sequences', 'users', 'counters'];

const DEFAULT_COUNTERS = ['Guichê 01', 'Guichê 02', 'Guichê 03'];
const DEFAULT_USERS = [
  { name: 'Gestor do Laboratório', username: 'gestor', password: 'gestor123', role: 'GESTOR' },
  { name: 'Atendente Padrão', username: 'atendente', password: 'atendente123', role: 'ATENDENTE' },
];

export const initDatabase = async ({ reset = false, silent = false } = {}) => {
  const log = silent ? () => {} : console.log;
  const { database, ...server } = config.db;
  const connection = await mysql.createConnection({ ...server, multipleStatements: true });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await connection.changeUser({ database });

    if (reset) {
      for (const table of TABLES_IN_DROP_ORDER) await connection.query(`DROP TABLE IF EXISTS ${table}`);
      log('Tabelas removidas.');
    }

    const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
    await connection.query(schema);
    log(`Esquema aplicado em "${database}".`);

    for (const name of DEFAULT_COUNTERS) {
      await connection.query('INSERT IGNORE INTO counters (name) VALUES (?)', [name]);
    }
    for (const user of DEFAULT_USERS) {
      const hash = await bcrypt.hash(user.password, 10);
      await connection.query(
        'INSERT IGNORE INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
        [user.name, user.username, hash, user.role],
      );
    }
    log('Dados iniciais: 3 guichês, usuários "gestor" (gestor123) e "atendente" (atendente123).');
  } finally {
    await connection.end();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase({ reset: process.argv.includes('--reset') }).catch((error) => {
    console.error('Falha ao inicializar o banco:', error.message);
    process.exit(1);
  });
}
