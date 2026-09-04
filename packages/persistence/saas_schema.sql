-- BOS production SaaS domain schema. Existing bos_records remains for backward compatibility.
CREATE TABLE IF NOT EXISTS bos_workspace_members (
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES bos_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS bos_workspace_members_user_idx ON bos_workspace_members(user_id);

CREATE TABLE IF NOT EXISTS bos_workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by TEXT NOT NULL REFERENCES bos_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bos_workspace_invites_workspace_idx ON bos_workspace_invitations(workspace_id,status);
CREATE INDEX IF NOT EXISTS bos_workspace_invites_email_idx ON bos_workspace_invitations(email,status);

CREATE TABLE IF NOT EXISTS bos_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error','expired')),
  encrypted_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_by TEXT REFERENCES bos_users(id),
  last_error TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);
CREATE INDEX IF NOT EXISTS bos_integrations_workspace_idx ON bos_integrations(workspace_id,status);

CREATE TABLE IF NOT EXISTS bos_workflows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','disabled','archived')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES bos_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bos_workflows_workspace_idx ON bos_workflows(workspace_id,status);

CREATE TABLE IF NOT EXISTS bos_workflow_versions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES bos_workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  definition JSONB NOT NULL,
  created_by TEXT REFERENCES bos_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id,version)
);

CREATE TABLE IF NOT EXISTS bos_workflow_executions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES bos_workflows(id) ON DELETE SET NULL,
  workflow_version INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  trigger_type TEXT,
  idempotency_key TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS bos_executions_workspace_created_idx ON bos_workflow_executions(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS bos_executions_workflow_idx ON bos_workflow_executions(workflow_id,created_at DESC);
CREATE INDEX IF NOT EXISTS bos_executions_status_idx ON bos_workflow_executions(workspace_id,status);

CREATE TABLE IF NOT EXISTS bos_execution_steps (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES bos_workflow_executions(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed','skipped')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(execution_id,step_key)
);
CREATE INDEX IF NOT EXISTS bos_execution_steps_execution_idx ON bos_execution_steps(execution_id,step_index);

CREATE TABLE IF NOT EXISTS bos_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  signature_valid BOOLEAN,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed','ignored')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,external_id)
);
CREATE INDEX IF NOT EXISTS bos_events_workspace_idx ON bos_events(workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS bos_notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES bos_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bos_notifications_user_idx ON bos_notifications(user_id,read_at,created_at DESC);

CREATE TABLE IF NOT EXISTS bos_audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES bos_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bos_audit_workspace_idx ON bos_audit_logs(workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS bos_billing_accounts (
  workspace_id TEXT PRIMARY KEY REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  provider TEXT,
  customer_id TEXT,
  subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bos_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES bos_workspaces(tenant_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bos_jobs_queue_idx ON bos_jobs(status,run_at);

-- Backfill owners into the membership table. Safe to run repeatedly.
INSERT INTO bos_workspace_members(workspace_id,user_id,role,status)
SELECT tenant_id,owner_user_id,'owner','active' FROM bos_workspaces
ON CONFLICT (workspace_id,user_id) DO NOTHING;
