export const eventRepository = {
  async insert(db, { ticketId, fromStatus = null, toStatus, userId = null, counterId = null, at }) {
    await db.query(
      `INSERT INTO ticket_events (ticket_id, from_status, to_status, user_id, counter_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, fromStatus, toStatus, userId, counterId, at],
    );
  },

  async listByTicket(db, ticketId) {
    const [rows] = await db.query(
      'SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at, id',
      [ticketId],
    );
    return rows;
  },
};
