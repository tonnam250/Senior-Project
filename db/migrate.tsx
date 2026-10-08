import fs from 'fs';
import path from 'path';
import pool from './db';

const sql = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id           SERIAL PRIMARY KEY,
  document_id  INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  text         TEXT NOT NULL,
  page_start   INT NOT NULL,
  page_end     INT NOT NULL,
  UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id   INT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  embedding  vector(1024) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS summaries (
  id              SERIAL PRIMARY KEY,
  document_id     INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  level           INT NOT NULL,
  node_index      INT NOT NULL,
  text            TEXT NOT NULL,
  page_start      INT NOT NULL,
  page_end        INT NOT NULL,
  chunk_id        INT REFERENCES chunks(id) ON DELETE CASCADE,
  parent_id       INT REFERENCES summaries(id),
  model           TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  elapsed_ms      INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (document_id, level, node_index)
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