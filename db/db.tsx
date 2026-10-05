import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
    throw new Error('POSTGRES_URL is not set');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('Error occured at pool', err);
});

export default pool;