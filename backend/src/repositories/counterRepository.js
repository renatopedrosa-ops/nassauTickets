export const counterRepository = {
  async list(db, { onlyActive = false } = {}) {
    const [rows] = await db.query(
      `SELECT id, name, active, created_at FROM counters ${onlyActive ? 'WHERE active = TRUE' : ''} ORDER BY name`,
    );
    return rows;
  },

  async findById(db, id) {
    const [rows] = await db.query('SELECT id, name, active FROM counters WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async insert(db, counter) {
    const [result] = await db.query('INSERT INTO counters SET ?', [counter]);
    return result.insertId;
  },

  async update(db, id, fields) {
    if (Object.keys(fields).length === 0) return;
    await db.query('UPDATE counters SET ? WHERE id = ?', [fields, id]);
  },
};
