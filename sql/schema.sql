CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  claim_ref TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  member_id TEXT,
  subscriber_id TEXT NOT NULL,
  subscriber_id_source TEXT NOT NULL,
  ssn TEXT,
  last_name TEXT,
  first_name TEXT,
  dob TEXT,
  gender TEXT,
  enrichment_snapshot JSONB NOT NULL,
  x12_content TEXT,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS claim_lines (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  cpt TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  service_date TEXT NOT NULL,
  diagnosis TEXT
);

CREATE TABLE IF NOT EXISTS remits (
  id SERIAL PRIMARY KEY,
  claim_ref TEXT,
  member_id TEXT,
  ssn TEXT,
  patient_name TEXT,
  dob TEXT,
  paid_amount NUMERIC(12, 2),
  raw_content TEXT,
  matched_claim_id INTEGER REFERENCES claims(id),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id SERIAL PRIMARY KEY,
  remit_id INTEGER REFERENCES remits(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
