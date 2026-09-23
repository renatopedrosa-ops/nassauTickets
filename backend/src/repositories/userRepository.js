const PUBLIC_COLUMNS = 'id, name, username, role, active, created_at';

export const userRepository = {
  async findByUsername(db, username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] ?? null;
  },

  async findById(db, id) {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    return rows[0] ?? null;
  },

  async list(db) {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY name`);
    return rows;
  },

  async insert(db, user) {
    const [result] = await db.query('INSERT INTO users SET ?', [user]);
    return result.insertId;
  },

  async update(db, id, fields) {
    if (Object.keys(fields).length === 0) return;
    await db.query('UPDATE users SET ? WHERE id = ?', [fields, id]);
  },
};
