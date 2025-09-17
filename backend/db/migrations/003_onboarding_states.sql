-- Migration: Create onboarding_states table for 4-step wizard
-- This table tracks user progress through the onboarding wizard

CREATE TABLE IF NOT EXISTS onboarding_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    step INTEGER NOT NULL DEFAULT 1 CHECK (step >= 1 AND step <= 4),
    data JSONB NOT NULL DEFAULT '{}',
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_onboarding_states_step ON onboarding_states(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_completed ON onboarding_states(completed_at) WHERE completed_at IS NOT NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_states_updated_at
    BEFORE UPDATE ON onboarding_states
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_states_updated_at();

-- Add comments for documentation
COMMENT ON TABLE onboarding_states IS 'Tracks user progress through 4-step onboarding wizard';
COMMENT ON COLUMN onboarding_states.user_id IS 'Reference to users table';
COMMENT ON COLUMN onboarding_states.step IS 'Current step (1-4): 1=Business Profile, 2=Gmail Integration, 3=Label Mapping, 4=Team & Notifications';
COMMENT ON COLUMN onboarding_states.data IS 'JSONB data for all onboarding steps';
COMMENT ON COLUMN onboarding_states.completed_at IS 'Timestamp when onboarding was completed (NULL if not completed)';
