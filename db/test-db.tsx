import pool from './db';

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Connection_Success:', result.rows[0]);
  } catch (err) {
    console.error('Connection_Failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection();