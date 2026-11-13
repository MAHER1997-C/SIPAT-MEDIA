-- Skema Database Supabase PostgreSQL untuk SIPAT Media (PPTQ Qoryatul Qur'an & Qoryah TV)
-- Catatan: Backend aplikasi (/api/*) otomatis menjalankan perintah CREATE TABLE IF NOT EXISTS ini saat koneksi pertama.
-- Anda juga dapat menjalankan skema ini secara manual di SQL Editor Supabase jika ingin menggunakan akses langsung REST client.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  app_title TEXT NOT NULL,
  pesantren_name TEXT NOT NULL,
  media_team_name TEXT NOT NULL,
  default_pickup_location TEXT NOT NULL,
  media_leader_phone TEXT NOT NULL,
  whatsapp_group_link TEXT NOT NULL,
  admin_pin TEXT NOT NULL,
  logo_type TEXT DEFAULT 'preset',
  logo_preset TEXT DEFAULT 'tv',
  logo_custom_url TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  condition TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  specs TEXT,
  notes TEXT,
  current_borrower JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_requests (
  id TEXT PRIMARY KEY,
  unit_name TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  borrower_phone TEXT NOT NULL,
  items JSONB NOT NULL,
  start_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_date TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  pickup_location TEXT,
  rejection_reason TEXT,
  return_notes TEXT,
  admin_notes TEXT,
  created_at TEXT NOT NULL,
  approved_at TEXT,
  returned_at TEXT,
  approved_by TEXT
);

CREATE TABLE IF NOT EXISTS media_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  start_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_date TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  crew_assigned JSONB,
  required_gear JSONB,
  description TEXT,
  related_loan_id TEXT
);

-- Kebijakan Row Level Security (RLS) agar aplikasi web dapat membaca & menulis data secara sinkron
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow public access app_settings') THEN
    CREATE POLICY "Allow public access app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_items' AND policyname = 'Allow public access media_items') THEN
    CREATE POLICY "Allow public access media_items" ON media_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loan_requests' AND policyname = 'Allow public access loan_requests') THEN
    CREATE POLICY "Allow public access loan_requests" ON loan_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_events' AND policyname = 'Allow public access media_events') THEN
    CREATE POLICY "Allow public access media_events" ON media_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
