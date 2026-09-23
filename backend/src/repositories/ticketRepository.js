// Acesso à tabela `tickets` e às tabelas de controle. `db` pode ser o pool ou uma conexão em transação.
const UPDATABLE = new Set([
  'status', 'first_call_at', 'second_call_at', 'started_at', 'finished_at',
  'closed_at', 'counter_id', 'user_id',
]);

export const ticketRepository = {
  /** Incrementa a sequência diária do tipo de forma atômica e devolve o novo valor (RN02). */
  async nextSequence(db, serviceDate, type) {
    await db.query(
      `INSERT INTO ticket_sequences (service_date, type, last_seq) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`,
      [serviceDate, type],
    );
    const [rows] = await db.query(
      'SELECT last_seq FROM ticket_sequences WHERE service_date = ? AND type = ?',
      [serviceDate, type],
    );
    return rows[0].last_seq;
  },

  async insert(db, ticket) {
    const [result] = await db.query('INSERT INTO tickets SET ?', [ticket]);
    return result.insertId;
  },

  async update(db, id, fields) {
    const keys = Object.keys(fields).filter((key) => UPDATABLE.has(key));
    if (keys.length === 0) return;
    const assignments = keys.map((key) => `${key} = ?`).join(', ');
    await db.query(`UPDATE tickets SET ${assignments} WHERE id = ?`, [
      ...keys.map((key) => fields[key]),
      id,
    ]);
  },

  async findById(db, id) {
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  /** Senha que ocupa o guichê (chamada ou em atendimento), bloqueada para atualização. */
  async findActiveByCounter(db, counterId, { forUpdate = false } = {}) {
    const [rows] = await db.query(
      `SELECT * FROM tickets
        WHERE counter_id = ? AND status IN ('CHAMADA', 'CHAMADA_NOVAMENTE', 'EM_ATENDIMENTO')
        ORDER BY first_call_at DESC LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`,
      [counterId],
    );
    return rows[0] ?? null;
  },

  /** Garante a linha de controle do dia. Executada fora da transação para não disputar travas. */
  async ensureCallControl(db, serviceDate) {
    await db.query('INSERT IGNORE INTO call_control (service_date) VALUES (?)', [serviceDate]);
  },

  /**
   * Trava a linha de controle do dia (mutex) e devolve o último tipo chamado.
   * Todas as chamadas "próxima senha" do dia passam por aqui, uma de cada vez (RN14).
   */
  async lockCallControl(db, serviceDate) {
    const [rows] = await db.query(
      'SELECT last_called_type FROM call_control WHERE service_date = ? FOR UPDATE',
      [serviceDate],
    );
    return rows[0].last_called_type;
  },

  async setLastCalledType(db, serviceDate, type) {
    await db.query('UPDATE call_control SET last_called_type = ? WHERE service_date = ?', [
      type,
      serviceDate,
    ]);
  },

  /** Primeira senha aguardando, respeitando a ordem de tipos e a ordem de emissão (RN03/RN05). */
  async pickNextWaiting(db, serviceDate, typeOrder) {
    const [rows] = await db.query(
      `SELECT * FROM tickets
        WHERE service_date = ? AND status = 'AGUARDANDO'
        ORDER BY FIELD(type, ?, ?, ?), sequence
        LIMIT 1 FOR UPDATE`,
      [serviceDate, ...typeOrder],
    );
    return rows[0] ?? null;
  },

  /** Últimas senhas chamadas no dia, para o painel (RF10). */
  async listRecentCalls(db, serviceDate, limit = 5) {
    const [rows] = await db.query(
      `SELECT t.id, t.number, t.type, t.status, t.first_call_at, t.second_call_at,
              COALESCE(t.second_call_at, t.first_call_at) AS last_call_at,
              c.name AS counter_name
         FROM tickets t
         JOIN counters c ON c.id = t.counter_id
        WHERE t.service_date = ? AND t.first_call_at IS NOT NULL
        ORDER BY last_call_at DESC
        LIMIT ?`,
      [serviceDate, limit],
    );
    return rows;
  },

  async countWaitingByType(db, serviceDate) {
    const [rows] = await db.query(
      `SELECT type, COUNT(*) AS total FROM tickets
        WHERE service_date = ? AND status = 'AGUARDANDO' GROUP BY type`,
      [serviceDate],
    );
    return rows;
  },

  /** Senhas que precisam ser encerradas: fila de dias anteriores (ou do dia, após o expediente). */
  async findToClose(db, lastDateToDiscard, lastDateToAbandon) {
    const [rows] = await db.query(
      `SELECT * FROM tickets
        WHERE (status IN ('EMITIDA', 'AGUARDANDO') AND service_date <= ?)
           OR (status IN ('CHAMADA', 'CHAMADA_NOVAMENTE') AND service_date <= ?)
        FOR UPDATE`,
      [lastDateToDiscard, lastDateToAbandon],
    );
    return rows;
  },

  async countByDate(db, serviceDate) {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM tickets WHERE service_date = ?', [
      serviceDate,
    ]);
    return rows[0].total;
  },

  /** Dados completos para os relatórios, com atendente e guichê. */
  async listForReport(db, fromDate, toDate) {
    const [rows] = await db.query(
      `SELECT t.*, c.name AS counter_name, u.name AS user_name
         FROM tickets t
         LEFT JOIN counters c ON c.id = t.counter_id
         LEFT JOIN users u    ON u.id = t.user_id
        WHERE t.service_date BETWEEN ? AND ?
        ORDER BY t.issued_at, t.id`,
      [fromDate, toDate],
    );
    return rows;
  },
};
