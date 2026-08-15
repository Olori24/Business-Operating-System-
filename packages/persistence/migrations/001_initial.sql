CREATE TABLE IF NOT EXISTS bos_records (
  tenant_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  value JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, record_type, record_id)
);

CREATE INDEX IF NOT EXISTS bos_records_tenant_type_idx
  ON bos_records (tenant_id, record_type);

CREATE INDEX IF NOT EXISTS bos_records_updated_at_idx
  ON bos_records (updated_at);

CREATE TABLE IF NOT EXISTS bos_schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
