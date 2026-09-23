import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'local',
  dateStrings: ['DATE'], // service_date volta como 'YYYY-MM-DD'
});

const RETRYABLE = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const MAX_ATTEMPTS = 3;

/**
 * Executa `work(connection)` dentro de uma transação READ COMMITTED
 * (sem gap locks: o FOR UPDATE trava apenas as linhas encontradas).
 * Commit se tudo der certo; rollback em qualquer erro.
 * Deadlocks são raros com a ordem de travas adotada, mas, se ocorrerem, a transação é repetida.
 */
export const withTransaction = async (work) => {
  for (let attempt = 1; ; attempt += 1) {
    const connection = await pool.getConnection();
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      if (!RETRYABLE.has(error.code) || attempt >= MAX_ATTEMPTS) throw error;
    } finally {
      connection.release();
    }
  }
};

export const checkDatabase = async () => {
  await pool.query('SELECT 1');
  return true;
};
