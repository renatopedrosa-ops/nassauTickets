import { TICKET_TYPES } from '../utils/format.js';

export function TicketBadge({ type, withLabel = false }) {
  return (
    <span className={`badge badge--${type}`}>
      {type}{withLabel && ` · ${TICKET_TYPES[type]?.label}`}
    </span>
  );
}
