-- Migration: Add Mailbox Mappings Table
-- Description: Add mailbox_mappings table for storing discovered and provisioned mailbox taxonomies
-- Date: 2025-09-18

-- =====================================================
-- 1. CREATE MAILBOX_MAPPINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS mailbox_mappings (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('gmail', 'o365')),
    client_id UUID REFERENCES client_config(client_id) ON DELETE SET NULL,
    mapping JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (user_id, provider)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for client_id lookups
CREATE INDEX IF NOT EXISTS idx_mailbox_mappings_client_id ON mailbox_mappings (client_id);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_mailbox_mappings_provider ON mailbox_mappings (provider);

-- Index for version tracking
CREATE INDEX IF NOT EXISTS idx_mailbox_mappings_version ON mailbox_mappings (version);

-- GIN index for JSONB mapping queries
CREATE INDEX IF NOT EXISTS idx_mailbox_mappings_mapping_gin ON mailbox_mappings USING GIN (mapping);

-- Index for updated_at for cache invalidation
CREATE INDEX IF NOT EXISTS idx_mailbox_mappings_updated_at ON mailbox_mappings (updated_at);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE mailbox_mappings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can only access their own mailbox mappings
CREATE POLICY "Users can access own mailbox mappings" ON mailbox_mappings
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can access all mailbox mappings (for admin operations)
CREATE POLICY "Service role can access all mailbox mappings" ON mailbox_mappings
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- =====================================================

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_mailbox_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_mailbox_mappings_updated_at
    BEFORE UPDATE ON mailbox_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_mailbox_mappings_updated_at();

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE mailbox_mappings IS 'Stores discovered and provisioned mailbox taxonomies for email providers';
COMMENT ON COLUMN mailbox_mappings.user_id IS 'Reference to the user who owns this mailbox mapping';
COMMENT ON COLUMN mailbox_mappings.provider IS 'Email provider (gmail or o365)';
COMMENT ON COLUMN mailbox_mappings.client_id IS 'Optional reference to client configuration';
COMMENT ON COLUMN mailbox_mappings.mapping IS 'JSONB containing the mailbox taxonomy mapping';
COMMENT ON COLUMN mailbox_mappings.version IS 'Version number for mapping changes, incremented on updates';
COMMENT ON COLUMN mailbox_mappings.created_at IS 'Timestamp when the mapping was first created';
COMMENT ON COLUMN mailbox_mappings.updated_at IS 'Timestamp when the mapping was last updated';

-- =====================================================
-- 7. SAMPLE MAPPING STRUCTURE (FOR REFERENCE)
-- =====================================================

/*
Sample mapping JSONB structure:

{
  "canonical": {
    "URGENT": {
      "path": ["URGENT"],
      "color": "#FF0000",
      "gmail_id": "Label_123",
      "o365_id": "category_urgent"
    },
    "SALES": {
      "path": ["SALES"],
      "color": "#00FF00",
      "gmail_id": "Label_456",
      "o365_id": "category_sales"
    },
    "SUPPORT": {
      "path": ["SUPPORT"],
      "color": "#0000FF",
      "gmail_id": "Label_789",
      "o365_id": "category_support"
    }
  },
  "discovered": {
    "existing_labels": [
      {
        "id": "Label_123",
        "name": "URGENT",
        "path": ["URGENT"],
        "color": "#FF0000",
        "type": "user"
      }
    ],
    "suggested_reuse": ["URGENT"],
    "suggested_create": ["SALES", "SUPPORT"],
    "missing_count": 2
  },
  "provisioned": {
    "created": ["SALES", "SUPPORT"],
    "skipped": ["URGENT"],
    "failed": []
  }
}
*/
