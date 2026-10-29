-- Run this script in Supabase SQL Editor before starting the backend.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admins_email_lowercase CHECK (email = LOWER(email))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('Parent', 'Student', 'School')),
  category TEXT NOT NULL CHECK (category IN ('Scholarship', 'Concert', 'Admission', 'General Query')),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  phone TEXT NOT NULL CHECK (phone ~ '^[+0-9() .-]{7,25}$'),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 5 AND 3000),
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_category_idx ON inquiries (category);
CREATE INDEX IF NOT EXISTS inquiries_user_type_idx ON inquiries (user_type);
CREATE INDEX IF NOT EXISTS inquiries_phone_idx ON inquiries (phone);
CREATE INDEX IF NOT EXISTS inquiries_name_lower_idx ON inquiries (LOWER(name));

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS inquiries_set_updated_at ON inquiries;
CREATE TRIGGER inquiries_set_updated_at BEFORE UPDATE ON inquiries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create admins through POST /api/auth/setup using ADMIN_SETUP_SECRET.
-- Never store plaintext passwords or expose DATABASE_URL in the frontend.
