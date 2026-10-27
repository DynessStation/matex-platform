import * as mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Log pool-level errors instead of letting an unhandled 'error' event crash the process.
(pool as unknown as NodeJS.EventEmitter).on('error', (err: unknown) => {
  console.error(err);
});
