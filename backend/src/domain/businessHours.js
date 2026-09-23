import { config } from '../config/env.js';

/** RN01 — expediente das 7h às 17h (configurável). */
export const isWithinBusinessHours = (date, hours = config.businessHours) => {
  if (!hours.enforce) return true;
  const hour = date.getHours();
  return hour >= hours.open && hour < hours.close;
};

export const isAfterClosing = (date, hours = config.businessHours) =>
  hours.enforce && date.getHours() >= hours.close;
