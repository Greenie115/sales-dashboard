-- Create shared_dashboards table
CREATE TABLE IF NOT EXISTS shared_dashboards (
  id BIGSERIAL PRIMARY KEY,
  share_id UUID NOT NULL UNIQUE,
  share_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
);

-- Create index on share_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_share_id ON shared_dashboards(share_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_created_at ON shared_dashboards(created_at);

-- Create index on expires_at for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_expires_at ON shared_dashboards(expires_at);

-- Comment on table
COMMENT ON TABLE shared_dashboards IS 'Stores shared dashboard configurations and data';

-- Comments on columns
COMMENT ON COLUMN shared_dashboards.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN shared_dashboards.share_id IS 'UUID used in share URLs';
COMMENT ON COLUMN shared_dashboards.share_config IS 'JSON configuration for the shared dashboard';
COMMENT ON COLUMN shared_dashboards.created_at IS 'Timestamp when the share was created';
COMMENT ON COLUMN shared_dashboards.expires_at IS 'Timestamp when the share expires';
COMMENT ON COLUMN shared_dashboards.created_by IS 'User ID who created the share';
