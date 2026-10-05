import fs from 'fs';
import path from 'path';
import pool from './db';

const sql = `
CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL,
  page_count  INT,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id           SERIAL PRIMARY KEY,
  document_id  INT REFERENCES documents(id) ON DELETE CASCADE,
  page_number  INT NOT NULL,
  text         TEXT NOT NULL,
  UNIQUE (document_id, page_number)
);
`;

async function migrate() {
  try {
    await pool.query(sql);
    console.log('Create table success!');

    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('Current table:', result.rows);
  } catch (err) {
    console.error('Create table failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();