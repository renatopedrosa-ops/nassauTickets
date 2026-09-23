import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const toBool = (value, fallback) =>
  value === undefined ? fallback : ['1', 'true', 'yes'].includes(String(value).toLowerCase());

export const config = {
  port: Number(process.env.PORT ?? 3001),
  timezone: process.env.APP_TIMEZONE ?? 'America/Recife',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'nassau',
    password: process.env.DB_PASSWORD ?? 'nassau123',
    database: process.env.DB_NAME ?? 'nassau_tickets',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'troque-este-segredo',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '10h',
  },
  businessHours: {
    open: Number(process.env.OPEN_HOUR ?? 7),
    close: Number(process.env.CLOSE_HOUR ?? 17),
    enforce: toBool(process.env.ENFORCE_BUSINESS_HOURS, true),
  },
};

// Todas as datas do sistema (número da senha, expediente, relatórios) usam o fuso do laboratório.
process.env.TZ = config.timezone;
