const N8nWorkflowGenerator = require('../services/n8nWorkflowGenerator');

describe('N8nWorkflowGenerator', () => {
  let generator;
  let mockBusinessData;

  beforeEach(() => {
    generator = new N8nWorkflowGenerator();
    
    mockBusinessData = {
      user_id: 'user-123',
      company_name: 'Hot Tub Paradise Ltd',
      business_phone: '(555) 123-4567',
      emergency_phone: '(555) 999-9999',
      business_address: '123 Main St, City, State 12345',
      service_area_radius: 25,
      primary_services: ['installation', 'repair', 'maintenance'],
      business_hours: 'Mon-Fri 8AM-6PM',
      response_time_goal: '4_hours',
      team_size: '2-3'
    };
  });

  describe('constructor', () => {
    test('should initialize with secure base template', () => {
      expect(generator.baseTemplate).toBeDefined();
      expect(generator.baseTemplate).toHaveProperty('name');
      expect(generator.baseTemplate).toHaveProperty('nodes');
      expect(generator.baseTemplate).toHaveProperty('connections');
      expect(generator.baseTemplate.nodes).toBeInstanceOf(Array);
    });

    test('should not expose external file paths', () => {
      // Ensure no file system dependencies
      expect(generator).not.toHaveProperty('templatePath');
      expect(generator.baseTemplate).toBeDefined();
    });
  });

  describe('getSecureBaseTemplate', () => {
    test('should return valid n8n workflow structure', () => {
      const template = generator.getSecureBaseTemplate();

      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('nodes');
      expect(template).toHaveProperty('connections');
      expect(template).toHaveProperty('active', false);
      expect(template).toHaveProperty('versionId');

      // Check essential nodes are present
      const nodeNames = template.nodes.map(node => node.name);
      expect(nodeNames).toContain('Gmail Trigger');
      expect(nodeNames).toContain('AI Master Classifier');
      expect(nodeNames).toContain('Category Switch');
    });

    test('should have proper node structure', () => {
      const template = generator.getSecureBaseTemplate();

      template.nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('parameters');
      });
    });
  });

  describe('generatePersonalizedWorkflow', () => {
    test('should generate personalized workflow successfully', async () => {
      const customManagers = ['Hailey', 'Jillian', 'Stacie'];
      const customSuppliers = ['Aqua Spa', 'Paradise Patio'];
      const labelMappings = [];

      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        labelMappings,
        customManagers,
        customSuppliers,
        'RingCentral'
      );

      expect(workflow).toHaveProperty('name', 'Hot Tub Paradise Ltd - Email Automation Workflow');
      expect(workflow).toHaveProperty('meta');
      expect(workflow.meta).toHaveProperty('instanceId', 'user-123');
      expect(workflow.meta).toHaveProperty('companyName', 'Hot Tub Paradise Ltd');
      expect(workflow.meta).toHaveProperty('businessType', 'hot-tub-spa');
      expect(workflow.meta).toHaveProperty('phoneSystem', 'RingCentral');
    });

    test('should update Gmail credentials with user-specific info', async () => {
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        [],
        [],
        'RingCentral'
      );

      const gmailNodes = workflow.nodes.filter(node => 
        node.credentials && node.credentials.gmailOAuth2
      );

      gmailNodes.forEach(node => {
        expect(node.credentials.gmailOAuth2.id).toBe('user_user-123_gmail');
        expect(node.credentials.gmailOAuth2.name).toBe('Hot Tub Paradise Ltd Gmail');
      });
    });

    test('should generate standard label nodes', async () => {
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        [],
        [],
        'RingCentral'
      );

      // Should have standard category nodes
      const standardCategories = ['Urgent', 'Sales', 'Support', 'Banking', 'FormSub'];
      standardCategories.forEach(category => {
        const node = workflow.nodes.find(node => node.name === category);
        expect(node).toBeDefined();
        expect(node.type).toBe('n8n-nodes-base.gmail');
        expect(node.parameters.operation).toBe('addLabels');
      });
    });

    test('should add custom manager nodes', async () => {
      const customManagers = ['Hailey', 'Jillian', 'Stacie'];
      
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        customManagers,
        [],
        'RingCentral'
      );

      customManagers.forEach(managerName => {
        const node = workflow.nodes.find(node => node.name === managerName);
        expect(node).toBeDefined();
        expect(node.type).toBe('n8n-nodes-base.gmail');
        expect(node.parameters.operation).toBe('addLabels');
      });
    });

    test('should add custom supplier nodes', async () => {
      const customSuppliers = ['Aqua Spa Pool Supply', 'Paradise Patio Furniture'];
      
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        [],
        customSuppliers,
        'RingCentral'
      );

      customSuppliers.forEach(supplierName => {
        const node = workflow.nodes.find(node => node.name === supplierName);
        expect(node).toBeDefined();
        expect(node.type).toBe('n8n-nodes-base.gmail');
      });
    });

    test('should limit managers to 5', async () => {
      const tooManyManagers = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
      
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        tooManyManagers,
        [],
        'RingCentral'
      );

      expect(workflow.meta.customManagers).toHaveLength(5);
      expect(workflow.meta.customManagers).toEqual(['M1', 'M2', 'M3', 'M4', 'M5']);
    });

    test('should limit suppliers to 10', async () => {
      const tooManySuppliers = Array.from({ length: 15 }, (_, i) => `Supplier ${i + 1}`);
      
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        [],
        tooManySuppliers,
        'RingCentral'
      );

      expect(workflow.meta.customSuppliers).toHaveLength(10);
    });
  });

  describe('generatePersonalizedSystemMessage', () => {
    test('should include business information', () => {
      const customManagers = ['Hailey', 'Jillian'];
      const customSuppliers = ['Aqua Spa'];
      
      const message = generator.generatePersonalizedSystemMessage(
        mockBusinessData,
        customManagers,
        customSuppliers,
        'RingCentral'
      );

      expect(message).toContain('Hot Tub Paradise Ltd');
      expect(message).toContain('(555) 123-4567');
      expect(message).toContain('25 miles');
      expect(message).toContain('Mon-Fri 8AM-6PM');
      expect(message).toContain('Within 4 hours');
      expect(message).toContain('RingCentral');
    });

    test('should include custom managers', () => {
      const customManagers = ['Hailey', 'Jillian', 'Stacie'];
      
      const message = generator.generatePersonalizedSystemMessage(
        mockBusinessData,
        customManagers,
        [],
        'RingCentral'
      );

      customManagers.forEach(manager => {
        expect(message).toContain(manager);
      });
    });

    test('should include custom suppliers', () => {
      const customSuppliers = ['Aqua Spa Pool Supply', 'Paradise Patio'];
      
      const message = generator.generatePersonalizedSystemMessage(
        mockBusinessData,
        [],
        customSuppliers,
        'RingCentral'
      );

      customSuppliers.forEach(supplier => {
        expect(message).toContain(supplier);
      });
    });

    test('should include emergency phone if provided', () => {
      const message = generator.generatePersonalizedSystemMessage(
        mockBusinessData,
        [],
        [],
        'RingCentral'
      );

      expect(message).toContain('Emergency Phone: (555) 999-9999');
    });

    test('should handle missing emergency phone', () => {
      const dataWithoutEmergency = { ...mockBusinessData };
      delete dataWithoutEmergency.emergency_phone;
      
      const message = generator.generatePersonalizedSystemMessage(
        dataWithoutEmergency,
        [],
        [],
        'RingCentral'
      );

      expect(message).not.toContain('Emergency Phone:');
    });
  });

  describe('extractBusinessDomains', () => {
    test('should extract domain from business email', () => {
      const businessDataWithEmail = {
        ...mockBusinessData,
        business_email: 'info@hottubparadise.com'
      };

      const domains = generator.extractBusinessDomains(businessDataWithEmail);
      
      expect(domains).toContain('*@hottubparadise.com');
    });

    test('should generate common domain patterns', () => {
      const domains = generator.extractBusinessDomains(mockBusinessData);
      
      expect(domains).toContain('*@hottubparadiseltd.ca');
      expect(domains).toContain('*@hottubparadiseltd.com');
    });

    test('should handle company names with special characters', () => {
      const businessDataWithSpecialChars = {
        ...mockBusinessData,
        company_name: 'Hot Tub & Spa Co. Ltd!'
      };

      const domains = generator.extractBusinessDomains(businessDataWithSpecialChars);
      
      // Should clean special characters
      expect(domains.some(domain => domain.includes('hottubspaco'))).toBe(true);
    });
  });

  describe('updateSwitchNodeWithAllCategories', () => {
    test('should add standard category rules', () => {
      const mockSwitchNode = {
        parameters: {
          rules: {
            values: []
          }
        }
      };

      generator.updateSwitchNodeWithAllCategories(mockSwitchNode, [], []);

      expect(mockSwitchNode.parameters.rules.values.length).toBeGreaterThan(0);
      
      const categoryNames = mockSwitchNode.parameters.rules.values.map(rule => rule.outputKey);
      expect(categoryNames).toContain('Urgent');
      expect(categoryNames).toContain('Sales');
      expect(categoryNames).toContain('Support');
    });

    test('should add custom manager rules', () => {
      const mockSwitchNode = {
        parameters: {
          rules: {
            values: []
          }
        }
      };

      const customManagers = ['Hailey', 'Jillian'];
      generator.updateSwitchNodeWithAllCategories(mockSwitchNode, customManagers, []);

      const categoryNames = mockSwitchNode.parameters.rules.values.map(rule => rule.outputKey);
      expect(categoryNames).toContain('Hailey');
      expect(categoryNames).toContain('Jillian');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing business data gracefully', async () => {
      await expect(
        generator.generatePersonalizedWorkflow(null, [], [], [], 'RingCentral')
      ).rejects.toThrow();
    });

    test('should handle invalid label mappings', async () => {
      const invalidMappings = [{ invalid: 'mapping' }];
      
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        invalidMappings,
        [],
        [],
        'RingCentral'
      );

      // Should still generate workflow despite invalid mappings
      expect(workflow).toBeDefined();
      expect(workflow.name).toContain('Hot Tub Paradise Ltd');
    });
  });

  describe('Security', () => {
    test('should not expose sensitive template information', () => {
      const workflow = generator.getSecureBaseTemplate();
      
      // Should not contain file paths or sensitive system information
      const workflowString = JSON.stringify(workflow);
      expect(workflowString).not.toContain('C:\\');
      expect(workflowString).not.toContain('/home/');
      expect(workflowString).not.toContain('n8ntamplatehardcoded');
    });

    test('should use secure credential references', async () => {
      const workflow = await generator.generatePersonalizedWorkflow(
        mockBusinessData,
        [],
        [],
        [],
        'RingCentral'
      );

      const gmailNodes = workflow.nodes.filter(node => 
        node.credentials && node.credentials.gmailOAuth2
      );

      gmailNodes.forEach(node => {
        expect(node.credentials.gmailOAuth2.id).toMatch(/^user_[\w-]+_gmail$/);
        expect(node.credentials.gmailOAuth2.name).toContain('Gmail');
      });
    });
  });
});
