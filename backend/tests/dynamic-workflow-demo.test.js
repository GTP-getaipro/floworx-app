const N8nWorkflowGenerator = require('../services/n8nWorkflowGenerator');

describe('Dynamic n8n Workflow Generation - Real Business Examples', () => {
  let generator;

  beforeEach(() => {
    generator = new N8nWorkflowGenerator();
  });

  test('should generate workflow for hot tub business (original)', async () => {
    const hotTubBusiness = {
      user_id: 'user_123',
      company_name: 'The Hot Tub Man Ltd',
      business_phone: '(555) 123-4567',
      emergency_phone: '(555) 999-9999',
      business_address: '123 Spa Street, Hot Springs, CA 90210',
      service_area_radius: 25,
      business_hours: 'Mon-Fri 8AM-6PM',
      response_time_goal: '4_hours',
      primary_services: ['installation', 'repair', 'maintenance', 'water_care'],
      industry: 'hot-tub-spa',
      business_email: 'service@thehotubman.com'
    };

    const customManagers = ['Hailey', 'Jillian', 'Stacie', 'Aaron'];
    const customSuppliers = ['Aqua Spa Pool Supply', 'Paradise Patio Furniture Ltd', 'Strong Spas'];

    const workflow = await generator.generatePersonalizedWorkflow(
      hotTubBusiness, 
      {}, 
      customManagers, 
      customSuppliers, 
      'RingCentral'
    );

    // Verify workflow structure
    expect(workflow.name).toBe('The Hot Tub Man Ltd - Email Automation Workflow');
    expect(workflow.nodes).toBeDefined();
    expect(workflow.connections).toBeDefined();

    // Verify Gmail credentials are personalized
    const gmailNodes = workflow.nodes.filter(node => 
      node.type === 'n8n-nodes-base.gmailTrigger' || node.type === 'n8n-nodes-base.gmail'
    );
    
    gmailNodes.forEach(node => {
      expect(node.credentials.gmailOAuth2.id).toBe('user_user_123_gmail');
      expect(node.credentials.gmailOAuth2.name).toBe('The Hot Tub Man Ltd Gmail');
    });

    // Verify custom manager nodes were created
    const managerNodes = workflow.nodes.filter(node => 
      customManagers.includes(node.name)
    );
    expect(managerNodes).toHaveLength(4);

    // Verify custom supplier nodes were created
    const supplierNodes = workflow.nodes.filter(node => 
      customSuppliers.some(supplier => node.name.includes(supplier.substring(0, 15)))
    );
    expect(supplierNodes).toHaveLength(3);

    // Verify AI system message includes business details
    const aiNode = workflow.nodes.find(node => node.type === '@n8n/n8n-nodes-langchain.chatOpenAi');
    expect(aiNode.parameters.options.systemMessage).toContain('The Hot Tub Man Ltd');
    expect(aiNode.parameters.options.systemMessage).toContain('hot tub and spa service business');
    expect(aiNode.parameters.options.systemMessage).toContain('Hailey');
    expect(aiNode.parameters.options.systemMessage).toContain('Aqua Spa');
  });

  test('should generate workflow for HVAC business (new industry)', async () => {
    const hvacBusiness = {
      user_id: 'user_456',
      company_name: 'ABC HVAC Services',
      business_phone: '(555) 987-6543',
      emergency_phone: '(555) 911-HVAC',
      business_address: '456 Climate Control Ave, Comfort City, TX 75001',
      service_area_radius: 50,
      business_hours: 'Mon-Sat 7AM-7PM',
      response_time_goal: '1_hour',
      primary_services: ['heating_repair', 'cooling_repair', 'installation', 'maintenance'],
      industry: 'hvac',
      business_email: 'service@abchvac.com'
    };

    const customManagers = ['Mike Johnson', 'Sarah Chen', 'Tom Rodriguez'];
    const customSuppliers = ['Carrier Parts Direct', 'Trane Supply Co', 'Honeywell Wholesale'];

    const workflow = await generator.generatePersonalizedWorkflow(
      hvacBusiness, 
      {}, 
      customManagers, 
      customSuppliers, 
      'Vonage'
    );

    // Verify HVAC-specific customization
    expect(workflow.name).toBe('ABC HVAC Services - Email Automation Workflow');
    
    // Verify AI system message is HVAC-specific
    const aiNode = workflow.nodes.find(node => node.type === '@n8n/n8n-nodes-langchain.chatOpenAi');
    expect(aiNode.parameters.options.systemMessage).toContain('ABC HVAC Services');
    expect(aiNode.parameters.options.systemMessage).toContain('HVAC service business');
    expect(aiNode.parameters.options.systemMessage).toContain('heating_repair, cooling_repair');
    expect(aiNode.parameters.options.systemMessage).toContain('Within 1 hour');
    expect(aiNode.parameters.options.systemMessage).toContain('Mike Johnson');
    expect(aiNode.parameters.options.systemMessage).toContain('Carrier Parts Direct');

    // Verify Gmail filter excludes HVAC business domain
    const gmailTrigger = workflow.nodes.find(node => node.type === 'n8n-nodes-base.gmailTrigger');
    expect(gmailTrigger.parameters.filters.q).toContain('abchvac.com');

    // Verify custom nodes for HVAC managers
    const managerNodes = workflow.nodes.filter(node => 
      customManagers.includes(node.name)
    );
    expect(managerNodes).toHaveLength(3);
  });

  test('should generate workflow for plumbing business (another new industry)', async () => {
    const plumbingBusiness = {
      user_id: 'user_789',
      company_name: 'Quick Fix Plumbing',
      business_phone: '(555) PLUMBER',
      emergency_phone: '(555) 24-HOURS',
      business_address: '789 Pipe Lane, Watertown, FL 33101',
      service_area_radius: 30,
      business_hours: '24/7 Emergency Service',
      response_time_goal: '1_hour',
      primary_services: ['emergency_repair', 'drain_cleaning', 'installation', 'water_heater'],
      industry: 'plumbing',
      business_email: 'dispatch@quickfixplumbing.com'
    };

    const customManagers = ['Carlos Martinez', 'Lisa Wong'];
    const customSuppliers = ['Ferguson Plumbing', 'Home Depot Pro', 'Local Pipe Supply', 'Emergency Parts Co'];

    const workflow = await generator.generatePersonalizedWorkflow(
      plumbingBusiness, 
      {}, 
      customManagers, 
      customSuppliers, 
      'Google Voice'
    );

    // Verify plumbing-specific customization
    expect(workflow.name).toBe('Quick Fix Plumbing - Email Automation Workflow');
    
    // Verify AI system message is plumbing-specific
    const aiNode = workflow.nodes.find(node => node.type === '@n8n/n8n-nodes-langchain.chatOpenAi');
    expect(aiNode.parameters.options.systemMessage).toContain('Quick Fix Plumbing');
    expect(aiNode.parameters.options.systemMessage).toContain('plumbing service business');
    expect(aiNode.parameters.options.systemMessage).toContain('emergency_repair, drain_cleaning');
    expect(aiNode.parameters.options.systemMessage).toContain('24/7 Emergency Service');
    expect(aiNode.parameters.options.systemMessage).toContain('Carlos Martinez');
    expect(aiNode.parameters.options.systemMessage).toContain('Ferguson Plumbing');

    // Verify supplier limit (max 10)
    const supplierNodes = workflow.nodes.filter(node => 
      node.id && node.id.startsWith('supplier-')
    );
    expect(supplierNodes).toHaveLength(4); // All 4 suppliers should be included
  });

  test('should handle manager and supplier limits correctly', async () => {
    const business = {
      user_id: 'user_limits',
      company_name: 'Test Business',
      business_phone: '(555) 000-0000',
      industry: 'service-business'
    };

    // Test with more than 5 managers and 10 suppliers
    const tooManyManagers = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];
    const tooManySuppliers = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'];

    const workflow = await generator.generatePersonalizedWorkflow(
      business, 
      {}, 
      tooManyManagers, 
      tooManySuppliers
    );

    // Verify limits are enforced
    const managerNodes = workflow.nodes.filter(node => 
      node.id && node.id.startsWith('manager-')
    );
    expect(managerNodes).toHaveLength(5); // Max 5 managers

    const supplierNodes = workflow.nodes.filter(node => 
      node.id && node.id.startsWith('supplier-')
    );
    expect(supplierNodes).toHaveLength(10); // Max 10 suppliers

    // Verify metadata reflects limits
    expect(workflow.meta.customManagers).toHaveLength(5);
    expect(workflow.meta.customSuppliers).toHaveLength(10);
  });

  test('should work with minimal business data', async () => {
    const minimalBusiness = {
      user_id: 'user_minimal',
      company_name: 'Minimal Business'
    };

    const workflow = await generator.generatePersonalizedWorkflow(minimalBusiness, {}, [], []);

    // Should still generate a valid workflow
    expect(workflow.name).toBe('Minimal Business - Email Automation Workflow');
    expect(workflow.nodes).toBeDefined();
    expect(workflow.nodes.length).toBeGreaterThan(0);

    // Should have default values
    const aiNode = workflow.nodes.find(node => node.type === '@n8n/n8n-nodes-langchain.chatOpenAi');
    expect(aiNode.parameters.options.systemMessage).toContain('Minimal Business');
    expect(aiNode.parameters.options.systemMessage).toContain('service business');
  });
});
