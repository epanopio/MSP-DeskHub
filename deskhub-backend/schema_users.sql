CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMP,
  updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Profile fields
  nric_fin TEXT,
  mobile_no TEXT,
  address1 TEXT,
  address2 TEXT,
  address3 TEXT,
  birthdate DATE
);

-- Safe alter statements for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS nric_fin TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address1 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address2 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address3 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
