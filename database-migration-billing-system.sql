-- Floworx Billing System Migration
-- Comprehensive billing infrastructure for hot tub business SaaS
-- Run this after the password reset migration

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(50) NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
    plan_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2), -- Annual discount pricing
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Feature limits for hot tub businesses
    max_email_accounts INTEGER DEFAULT 1, -- Gmail accounts that can be connected
    max_workflows INTEGER DEFAULT 1, -- n8n workflows
    max_team_members INTEGER DEFAULT 3, -- Team notification recipients
    max_monthly_emails INTEGER DEFAULT 1000, -- Email processing limit
    max_business_categories INTEGER DEFAULT 5, -- Email categorization rules
    
    -- Advanced features
    includes_ai_responses BOOLEAN DEFAULT false,
    includes_crm_integration BOOLEAN DEFAULT false,
    includes_advanced_analytics BOOLEAN DEFAULT false,
    includes_priority_support BOOLEAN DEFAULT false,
    includes_custom_branding BOOLEAN DEFAULT false,
    
    -- Plan management
    is_active BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for subscription_plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON subscription_plans (plan_code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans (is_active);

-- =====================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    
    -- Subscription lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Trial management
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    trial_extended_days INTEGER DEFAULT 0,
    
    -- Subscription dates
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Pricing
    monthly_price DECIMAL(10,2),
    yearly_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment tracking
    next_billing_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    failed_payment_attempts INTEGER DEFAULT 0,
    
    -- Metadata
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one active subscription per user
    UNIQUE(user_id)
);

-- Create indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON user_subscriptions (next_billing_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end ON user_subscriptions (trial_ends_at);

-- =====================================================
-- 3. INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
    
    -- Invoice details
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void', 'refunded')),
    
    -- Financial details
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Billing period
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Payment tracking
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer'
    payment_reference VARCHAR(255), -- External payment ID
    
    -- Invoice metadata
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices (subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);

-- =====================================================
-- 4. INVOICE LINE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Line item details
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Usage-based billing support
    usage_type VARCHAR(50), -- 'emails_processed', 'workflows_executed', 'team_members'
    usage_quantity INTEGER,
    usage_period_start TIMESTAMP WITH TIME ZONE,
    usage_period_end TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoice_line_items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_usage_type ON invoice_line_items (usage_type);

-- =====================================================
-- 5. PAYMENT METHODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Payment method details
    type VARCHAR(30) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'bank_account', 'paypal')),
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'square'
    provider_payment_method_id VARCHAR(255) NOT NULL, -- External ID

    -- Card details (encrypted/tokenized)
    last_four VARCHAR(4),
    brand VARCHAR(20), -- 'visa', 'mastercard', 'amex'
    exp_month INTEGER,
    exp_year INTEGER,

    -- Bank account details (for ACH)
    bank_name VARCHAR(100),
    account_type VARCHAR(20), -- 'checking', 'savings'

    -- Status and preferences
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    billing_address JSONB, -- Store billing address as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods (user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods (is_active);

-- =====================================================
-- 6. USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),

    -- Usage metrics specific to hot tub businesses
    usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN (
        'emails_processed', 'workflows_executed', 'team_notifications_sent',
        'gmail_accounts_connected', 'business_categories_used', 'api_calls'
    )),

    -- Usage data
    usage_date DATE NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER, -- Plan limit for this metric

    -- Billing period tracking
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Metadata
    metadata JSONB, -- Store additional usage context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per user/type/date
    UNIQUE(user_id, usage_type, usage_date)
);

-- Create indexes for usage_tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON usage_tracking (subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type_date ON usage_tracking (usage_type, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_billing_period ON usage_tracking (billing_period_start, billing_period_end);

-- =====================================================
-- 7. BILLING EVENTS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'subscription_created', 'payment_succeeded', 'payment_failed', etc.
    event_data JSONB NOT NULL,

    -- External references
    external_id VARCHAR(255), -- Stripe event ID, PayPal transaction ID, etc.
    provider VARCHAR(50), -- 'stripe', 'paypal', 'internal'

    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id ON billing_events (subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events (event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed ON billing_events (processed);
CREATE INDEX IF NOT EXISTS idx_billing_events_external_id ON billing_events (external_id);

-- =====================================================
-- 8. COUPONS AND DISCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Coupon details
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Discount configuration
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Usage limits
    max_redemptions INTEGER, -- NULL = unlimited
    current_redemptions INTEGER DEFAULT 0,
    max_redemptions_per_user INTEGER DEFAULT 1,

    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Applicable plans (NULL = all plans)
    applicable_plans UUID[], -- Array of plan IDs

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_by VARCHAR(100), -- Admin who created the coupon
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_period ON coupons (valid_from, valid_until);

-- =====================================================
-- 9. COUPON REDEMPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Redemption details
    discount_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Metadata
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one redemption per user per coupon (unless coupon allows multiple)
    UNIQUE(coupon_id, user_id)
);

-- Create indexes for coupon_redemptions
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_date ON coupon_redemptions (redeemed_at);

-- =====================================================
-- 10. BILLING FUNCTIONS AND UTILITIES
-- =====================================================

-- Function to get current subscription for a user
CREATE OR REPLACE FUNCTION get_user_current_subscription(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_code VARCHAR(50),
    plan_name VARCHAR(100),
    status VARCHAR(50),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    monthly_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        us.id,
        sp.plan_code,
        sp.plan_name,
        us.status,
        us.trial_ends_at,
        us.next_billing_date,
        us.monthly_price
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has exceeded usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
    p_user_id UUID,
    p_usage_type VARCHAR(50),
    p_current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    current_usage INTEGER,
    usage_limit INTEGER,
    limit_exceeded BOOLEAN
) AS $$
DECLARE
    v_period_start TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current billing period if not provided
    IF p_current_period_start IS NULL THEN
        SELECT us.current_period_start, us.current_period_end
        INTO v_period_start, v_period_end
        FROM user_subscriptions us
        WHERE us.user_id = p_user_id;
    ELSE
        v_period_start := p_current_period_start;
        v_period_end := v_period_start + INTERVAL '1 month';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(ut.usage_count), 0)::INTEGER as current_usage,
        CASE p_usage_type
            WHEN 'emails_processed' THEN sp.max_monthly_emails
            WHEN 'workflows_executed' THEN sp.max_workflows
            WHEN 'team_notifications_sent' THEN sp.max_team_members * 100 -- Assume 100 notifications per member
            WHEN 'gmail_accounts_connected' THEN sp.max_email_accounts
            WHEN 'business_categories_used' THEN sp.max_business_categories
            ELSE NULL
        END as usage_limit,
        COALESCE(SUM(ut.usage_count), 0) >= CASE p_usage_type
            WHEN 'emails_processed' THEN sp.max_monthly_emails
            WHEN 'workflows_executed' THEN sp.max_workflows
            WHEN 'team_notifications_sent' THEN sp.max_team_members * 100
            WHEN 'gmail_accounts_connected' THEN sp.max_email_accounts
            WHEN 'business_categories_used' THEN sp.max_business_categories
            ELSE 0
        END as limit_exceeded
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    LEFT JOIN usage_tracking ut ON ut.user_id = us.user_id
        AND ut.usage_type = p_usage_type
        AND ut.usage_date >= v_period_start::DATE
        AND ut.usage_date < v_period_end::DATE
    WHERE us.user_id = p_user_id
    GROUP BY sp.max_monthly_emails, sp.max_workflows, sp.max_team_members,
             sp.max_email_accounts, sp.max_business_categories;
END;
$$ LANGUAGE plpgsql;

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
    p_user_id UUID,
    p_usage_type VARCHAR(50),
    p_usage_count INTEGER DEFAULT 1,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription_id UUID;
    v_period_start TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get user's current subscription and billing period
    SELECT us.id, us.current_period_start, us.current_period_end
    INTO v_subscription_id, v_period_start, v_period_end
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id AND us.status IN ('trial', 'active');

    IF v_subscription_id IS NULL THEN
        RETURN FALSE; -- No active subscription
    END IF;

    -- Insert or update usage tracking
    INSERT INTO usage_tracking (
        user_id, subscription_id, usage_type, usage_date, usage_count,
        billing_period_start, billing_period_end, metadata
    )
    VALUES (
        p_user_id, v_subscription_id, p_usage_type, v_today, p_usage_count,
        v_period_start, v_period_end, p_metadata
    )
    ON CONFLICT (user_id, usage_type, usage_date)
    DO UPDATE SET
        usage_count = usage_tracking.usage_count + p_usage_count,
        metadata = COALESCE(p_metadata, usage_tracking.metadata);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. INSERT DEFAULT SUBSCRIPTION PLANS
-- =====================================================

-- Insert default plans for hot tub businesses
INSERT INTO subscription_plans (
    plan_code, plan_name, description, price_monthly, price_yearly,
    max_email_accounts, max_workflows, max_team_members, max_monthly_emails, max_business_categories,
    includes_ai_responses, includes_crm_integration, includes_advanced_analytics, includes_priority_support, includes_custom_branding,
    trial_days
) VALUES
(
    'starter',
    'Starter Plan',
    'Perfect for small hot tub businesses just getting started with email automation',
    29.00, 290.00, -- $29/month, $290/year (2 months free)
    1, 1, 3, 1000, 5,
    false, false, false, false, false,
    14
),
(
    'professional',
    'Professional Plan',
    'Ideal for growing hot tub businesses with multiple team members and higher email volume',
    79.00, 790.00, -- $79/month, $790/year (2 months free)
    3, 3, 10, 5000, 10,
    true, false, true, true, false,
    14
),
(
    'enterprise',
    'Enterprise Plan',
    'For large hot tub businesses requiring advanced features, CRM integration, and custom branding',
    199.00, 1990.00, -- $199/month, $1990/year (2 months free)
    10, 10, 25, 20000, 25,
    true, true, true, true, true,
    14
);

-- =====================================================
-- 12. RLS POLICIES FOR BILLING TABLES
-- =====================================================

-- Enable RLS on all billing tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read access)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions (users can only access their own)
CREATE POLICY "Users can only access their own subscriptions" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for invoices (users can only access their own)
CREATE POLICY "Users can only access their own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for invoice_line_items (via invoice ownership)
CREATE POLICY "Users can only access their own invoice line items" ON invoice_line_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_line_items.invoice_id
            AND i.user_id = auth.uid()
        )
    );

-- RLS Policies for payment_methods (users can only access their own)
CREATE POLICY "Users can only access their own payment methods" ON payment_methods
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for usage_tracking (users can only access their own)
CREATE POLICY "Users can only access their own usage tracking" ON usage_tracking
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for billing_events (users can only access their own)
CREATE POLICY "Users can only access their own billing events" ON billing_events
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for coupons (public read access for active coupons)
CREATE POLICY "Anyone can view active coupons" ON coupons
    FOR SELECT USING (is_active = true);

-- RLS Policies for coupon_redemptions (users can only access their own)
CREATE POLICY "Users can only access their own coupon redemptions" ON coupon_redemptions
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 13. VERIFICATION QUERY
-- =====================================================
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'subscription_plans', 'user_subscriptions', 'invoices', 'invoice_line_items',
    'payment_methods', 'usage_tracking', 'billing_events', 'coupons', 'coupon_redemptions'
)
ORDER BY table_name, ordinal_position;
