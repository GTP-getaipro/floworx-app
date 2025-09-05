# 🚀 Scalable Email Automation Platform Architecture

## Current Limitations & Proposed Solutions

### **Current Issues:**
- Single hot-tub business focus (not scalable)
- Hardcoded business logic
- Manual configuration per client
- No multi-tenancy isolation
- Limited workflow templates

### **Proposed Scalable Architecture:**

## 1. 🏢 **Multi-Tenant Database Design**

```sql
-- Tenant isolation with row-level security
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(50) UNIQUE NOT NULL, -- client1.floworx.com
  business_name VARCHAR(255) NOT NULL,
  industry_id UUID REFERENCES industries(id),
  plan_type VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Industry-specific templates and rules
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'hot-tub-spa', 'plumbing', 'hvac', 'landscaping'
  slug VARCHAR(50) UNIQUE NOT NULL,
  email_patterns JSONB, -- Industry-specific email classification patterns
  default_labels JSONB, -- Standard labels for this industry
  workflow_template JSONB, -- Base n8n workflow template
  ai_prompts JSONB -- Industry-specific AI prompts
);

-- Dynamic business configurations per tenant
CREATE TABLE tenant_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  config_key VARCHAR(100) NOT NULL, -- 'email_signature', 'business_hours', 'service_area'
  config_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, config_key)
);

-- Scalable workflow management
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id UUID REFERENCES industries(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_json JSONB NOT NULL, -- Base n8n workflow
  version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  customization_points JSONB -- Which parts can be customized per tenant
);

-- Per-tenant workflow instances
CREATE TABLE tenant_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  template_id UUID REFERENCES workflow_templates(id),
  customizations JSONB, -- Tenant-specific modifications
  n8n_workflow_id VARCHAR(255), -- Actual n8n workflow ID
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, error
  deployed_at TIMESTAMP,
  last_sync TIMESTAMP
);
```

## 2. 🎯 **Industry-Agnostic Email Classification System**

```javascript
class UniversalEmailClassifier {
  constructor() {
    this.industryPatterns = new Map();
    this.loadIndustryPatterns();
  }

  async loadIndustryPatterns() {
    // Load patterns from database for all industries
    const industries = await this.db.query(`
      SELECT slug, email_patterns, ai_prompts 
      FROM industries WHERE is_active = true
    `);
    
    industries.forEach(industry => {
      this.industryPatterns.set(industry.slug, {
        patterns: industry.email_patterns,
        aiPrompts: industry.ai_prompts
      });
    });
  }

  async classifyEmail(email, tenantId) {
    const tenant = await this.getTenantWithIndustry(tenantId);
    const industryConfig = this.industryPatterns.get(tenant.industry_slug);
    
    // Use industry-specific patterns + tenant customizations
    const classification = await this.aiClassify(
      email, 
      industryConfig.aiPrompts,
      tenant.customizations
    );
    
    return this.applyTenantRules(classification, tenant);
  }
}
```

## 3. 🔧 **Dynamic Workflow Generation**

```javascript
class ScalableWorkflowGenerator {
  async generateTenantWorkflow(tenantId) {
    const tenant = await this.getTenantConfig(tenantId);
    const template = await this.getIndustryTemplate(tenant.industry_id);
    
    // Clone base template
    const workflow = JSON.parse(JSON.stringify(template.template_json));
    
    // Apply tenant-specific customizations
    workflow.name = `${tenant.business_name} - Email Automation`;
    
    // Dynamic node generation based on tenant config
    this.addCustomManagerNodes(workflow, tenant.managers);
    this.addCustomSupplierNodes(workflow, tenant.suppliers);
    this.updateAIPrompts(workflow, tenant.industry_prompts, tenant.custom_prompts);
    this.configureEmailSignature(workflow, tenant.signature_config);
    
    // Deploy to n8n with tenant isolation
    const n8nWorkflowId = await this.deployToN8n(workflow, tenant.subdomain);
    
    // Save deployment record
    await this.saveWorkflowDeployment(tenantId, template.id, n8nWorkflowId, workflow);
    
    return { workflowId: n8nWorkflowId, status: 'deployed' };
  }
}
```

## 4. 🏭 **Industry Template System**

```javascript
// Hot Tub & Spa Industry Template
const hotTubTemplate = {
  industry: 'hot-tub-spa',
  emailPatterns: {
    urgent: /urgent|emergency|broken|leak|not.*heating|won.*t.*work/i,
    service: /service|repair|fix|maintenance|clean/i,
    sales: /quote|price|install|new.*hot.*tub|buy/i,
    parts: /parts|chemicals|filter|cover|heater/i,
    seasonal: /winter|close|open|season/i
  },
  standardLabels: [
    'Urgent', 'Sales', 'Service-Technical', 'Service-Maintenance',
    'Parts-Chemicals', 'Seasonal-Winterization', 'Warranty'
  ],
  aiPrompts: {
    systemMessage: "You are an expert hot tub service coordinator...",
    classificationRules: "Classify emails for hot tub businesses..."
  }
};

// HVAC Industry Template  
const hvacTemplate = {
  industry: 'hvac',
  emailPatterns: {
    urgent: /no.*heat|no.*cooling|emergency|broken.*furnace/i,
    service: /service|repair|maintenance|tune.*up/i,
    sales: /quote|estimate|new.*system|replacement/i,
    parts: /parts|filter|thermostat|ductwork/i,
    seasonal: /spring.*tune|fall.*maintenance/i
  },
  standardLabels: [
    'Emergency', 'Sales', 'Service-Heating', 'Service-Cooling',
    'Maintenance', 'Parts', 'Installation'
  ]
};
```

## 5. 🔐 **Multi-Tenant Security & Isolation**

```javascript
// Row Level Security (RLS) policies
CREATE POLICY tenant_isolation ON tenant_configurations
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

// Middleware for tenant context
const tenantMiddleware = async (req, res, next) => {
  const subdomain = req.headers.host.split('.')[0];
  const tenant = await getTenantBySubdomain(subdomain);
  
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  
  // Set tenant context for database queries
  await supabase.rpc('set_config', {
    setting_name: 'app.current_tenant_id',
    setting_value: tenant.id
  });
  
  req.tenant = tenant;
  next();
};
```

## 6. 📊 **Scalable Analytics & Monitoring**

```javascript
class TenantAnalytics {
  async trackEmailProcessing(tenantId, emailData) {
    await this.db.insert('email_processing_logs', {
      tenant_id: tenantId,
      email_id: emailData.id,
      classification: emailData.classification,
      confidence_score: emailData.confidence,
      processing_time_ms: emailData.processingTime,
      ai_response_generated: emailData.aiResponseSent,
      timestamp: new Date()
    });
  }

  async getTenantMetrics(tenantId, dateRange) {
    return await this.db.query(`
      SELECT 
        COUNT(*) as total_emails,
        AVG(confidence_score) as avg_confidence,
        COUNT(*) FILTER (WHERE ai_response_generated) as ai_responses,
        AVG(processing_time_ms) as avg_processing_time
      FROM email_processing_logs 
      WHERE tenant_id = $1 AND timestamp >= $2 AND timestamp <= $3
    `, [tenantId, dateRange.start, dateRange.end]);
  }
}
```

## 7. 🚀 **Auto-Scaling Infrastructure**

```yaml
# docker-compose.yml for microservices
version: '3.8'
services:
  api-gateway:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    
  email-classifier:
    build: ./services/email-classifier
    replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
      
  workflow-generator:
    build: ./services/workflow-generator
    replicas: 2
    
  tenant-manager:
    build: ./services/tenant-manager
    replicas: 2
    
  analytics:
    build: ./services/analytics
    replicas: 1
    
  redis:
    image: redis:alpine
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: floworx_multi_tenant
```

## 8. 🎛️ **Admin Dashboard for Platform Management**

```javascript
// Platform admin endpoints
app.get('/admin/tenants', async (req, res) => {
  const tenants = await db.query(`
    SELECT t.*, i.name as industry_name, 
           COUNT(tw.id) as active_workflows
    FROM tenants t
    JOIN industries i ON t.industry_id = i.id
    LEFT JOIN tenant_workflows tw ON t.id = tw.tenant_id AND tw.status = 'active'
    GROUP BY t.id, i.name
    ORDER BY t.created_at DESC
  `);
  res.json(tenants);
});

app.post('/admin/industries', async (req, res) => {
  const { name, slug, emailPatterns, defaultLabels, workflowTemplate } = req.body;
  
  const industry = await db.insert('industries', {
    name, slug, 
    email_patterns: emailPatterns,
    default_labels: defaultLabels,
    workflow_template: workflowTemplate
  });
  
  res.json(industry);
});
```

## 9. 💰 **Subscription & Billing Integration**

```javascript
class SubscriptionManager {
  async createTenant(signupData) {
    const tenant = await this.db.insert('tenants', {
      business_name: signupData.businessName,
      subdomain: signupData.subdomain,
      industry_id: signupData.industryId,
      plan_type: 'trial' // 14-day trial
    });
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: signupData.email,
      name: signupData.businessName,
      metadata: { tenant_id: tenant.id }
    });
    
    // Setup trial period
    await this.setupTrialPeriod(tenant.id, 14);
    
    return tenant;
  }
  
  async handlePlanUpgrade(tenantId, newPlan) {
    const limits = this.getPlanLimits(newPlan);
    
    await this.db.update('tenants', 
      { plan_type: newPlan, updated_at: new Date() },
      { id: tenantId }
    );
    
    // Update workflow capabilities
    await this.updateWorkflowLimits(tenantId, limits);
  }
}
```

## 🎯 **Key Benefits of This Architecture:**

1. **🏢 Multi-Tenant**: Hundreds of businesses with complete isolation
2. **🔧 Industry-Agnostic**: Easy to add new industries (plumbing, HVAC, landscaping)
3. **⚡ Auto-Scaling**: Microservices that scale based on demand
4. **🎨 Customizable**: Each tenant can customize their automation
5. **📊 Analytics**: Per-tenant metrics and platform-wide insights
6. **💰 Monetizable**: Built-in subscription and billing management
7. **🔒 Secure**: Row-level security and tenant isolation
8. **🚀 Fast Deployment**: New tenants can be onboarded in minutes

This architecture transforms the current single-business solution into a scalable SaaS platform that can serve hundreds of businesses across multiple industries while maintaining the intelligent email automation capabilities.
