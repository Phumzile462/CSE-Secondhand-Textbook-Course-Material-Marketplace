const { Pool } = require('pg');

let pool;
let ready;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  course_code VARCHAR(30) NOT NULL,
  department VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  condition VARCHAR(20) NOT NULL,
  seller_name VARCHAR(100) NOT NULL,
  seller_contact VARCHAR(100) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_books_course ON books (course_code);
CREATE INDEX IF NOT EXISTS idx_books_status ON books (status);
`;

async function query(text, params) {
  const p = getPool();
  if (!ready) ready = p.query(SCHEMA).catch((e) => { ready = null; throw e; });
  await ready;
  return p.query(text, params);
}

module.exports = { query };
