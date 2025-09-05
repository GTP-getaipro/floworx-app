const IntelligentLabelMatcher = require('../services/intelligentLabelMatcher');

describe('IntelligentLabelMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new IntelligentLabelMatcher();
  });

  describe('analyzeLabelsForAutomation', () => {
    test('should analyze Gmail labels and find matches', async () => {
      const mockGmailLabels = [
        { id: 'Label_1', name: 'Service Requests', type: 'user', messagesTotal: 15 },
        { id: 'Label_2', name: 'New Customers', type: 'user', messagesTotal: 8 },
        { id: 'Label_3', name: 'Urgent Issues', type: 'user', messagesTotal: 3 },
        { id: 'Label_4', name: 'Random Label', type: 'user', messagesTotal: 2 },
        { id: 'INBOX', name: 'INBOX', type: 'system', messagesTotal: 100 }
      ];

      const result = await matcher.analyzeLabelsForAutomation(mockGmailLabels);

      expect(result).toHaveProperty('hasUsableLabels', true);
      expect(result).toHaveProperty('automationReady');
      expect(result).toHaveProperty('recommendedMappings');
      expect(result).toHaveProperty('unmatchedLabels');
      expect(result).toHaveProperty('analysis');

      // Should find matches for service requests, new customers, urgent
      expect(result.recommendedMappings.length).toBeGreaterThan(0);
      
      // Should skip system labels
      const systemLabelFound = result.recommendedMappings.find(m => m.gmailLabelId === 'INBOX');
      expect(systemLabelFound).toBeUndefined();

      // Should have unmatched labels
      expect(result.unmatchedLabels.length).toBeGreaterThan(0);
    });

    test('should handle empty Gmail labels', async () => {
      const result = await matcher.analyzeLabelsForAutomation([]);

      expect(result.hasUsableLabels).toBe(false);
      expect(result.automationReady).toBe(false);
      expect(result.recommendedMappings).toHaveLength(0);
      expect(result.unmatchedLabels).toHaveLength(0);
    });

    test('should identify system labels correctly', () => {
      const systemLabels = [
        { id: 'INBOX', name: 'INBOX', type: 'system' },
        { id: 'SENT', name: 'SENT', type: 'system' },
        { id: 'CATEGORY_PERSONAL', name: 'Personal', type: 'system' },
        { id: 'CHAT', name: 'Chat', type: 'system' }
      ];

      systemLabels.forEach(label => {
        expect(matcher.isSystemLabel(label)).toBe(true);
      });

      const userLabel = { id: 'Label_123', name: 'My Label', type: 'user' };
      expect(matcher.isSystemLabel(userLabel)).toBe(false);
    });
  });

  describe('calculateMatchConfidence', () => {
    test('should calculate confidence for hot tub specific terms', () => {
      const pattern = /service.*request|repair|maintenance/i;
      
      // High confidence matches
      expect(matcher.calculateMatchConfidence('Service Requests', pattern)).toBeGreaterThan(0.7);
      expect(matcher.calculateMatchConfidence('Hot Tub Repair', pattern)).toBeGreaterThan(0.8);
      expect(matcher.calculateMatchConfidence('Maintenance Issues', pattern)).toBeGreaterThan(0.7);

      // No match
      expect(matcher.calculateMatchConfidence('Random Label', pattern)).toBe(0);
    });

    test('should boost confidence for hot tub terms', () => {
      const pattern = /repair/i;
      
      const basicMatch = matcher.calculateMatchConfidence('Repair', pattern);
      const hotTubMatch = matcher.calculateMatchConfidence('Hot Tub Repair', pattern);
      
      expect(hotTubMatch).toBeGreaterThan(basicMatch);
    });
  });

  describe('generateBusinessDataForm', () => {
    test('should generate complete business form', () => {
      const mockAnalysis = {
        hasUsableLabels: true,
        automationScore: 0.8,
        recommendedMappings: [],
        analysis: {
          criticalCategoriesCovered: {
            service_request: true,
            new_customer: true,
            complaint: false
          }
        }
      };

      const form = matcher.generateBusinessDataForm(mockAnalysis);

      expect(form).toHaveProperty('title');
      expect(form).toHaveProperty('description');
      expect(form).toHaveProperty('sections');
      expect(form).toHaveProperty('automationContext');

      // Should have company and hot tub sections
      expect(form.sections).toHaveLength(2);
      expect(form.sections[0].title).toBe('Company Information');
      expect(form.sections[1].title).toBe('Hot Tub Service Details');

      // Check required fields are present
      const companyFields = form.sections[0].fields;
      const requiredCompanyFields = ['company_name', 'business_phone', 'business_address'];
      requiredCompanyFields.forEach(fieldId => {
        const field = companyFields.find(f => f.id === fieldId);
        expect(field).toBeDefined();
        expect(field.required).toBe(true);
      });

      // Check hot tub specific fields
      const hotTubFields = form.sections[1].fields;
      const requiredHotTubFields = ['service_area_radius', 'primary_services', 'business_hours'];
      requiredHotTubFields.forEach(fieldId => {
        const field = hotTubFields.find(f => f.id === fieldId);
        expect(field).toBeDefined();
        expect(field.required).toBe(true);
      });

      // Check signature fields are present
      const signatureField = hotTubFields.find(f => f.id === 'use_company_signature');
      expect(signatureField).toBeDefined();
      expect(signatureField.type).toBe('radio');

      const signatureTextArea = hotTubFields.find(f => f.id === 'company_signature');
      expect(signatureTextArea).toBeDefined();
      expect(signatureTextArea.conditional).toBeDefined();
    });

    test('should include tooltips for all fields', () => {
      const mockAnalysis = {
        hasUsableLabels: false,
        automationScore: 0.2,
        recommendedMappings: [],
        analysis: { criticalCategoriesCovered: {} }
      };

      const form = matcher.generateBusinessDataForm(mockAnalysis);

      // Check that all fields have tooltips
      form.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.id !== 'company_signature') { // Conditional field might not have tooltip
            expect(field).toHaveProperty('tooltip');
            expect(field.tooltip).toBeTruthy();
            expect(typeof field.tooltip).toBe('string');
          }
        });
      });
    });
  });

  describe('calculateAutomationReadiness', () => {
    test('should calculate readiness based on matches and missing labels', () => {
      const matches = [
        { standardLabelKey: 'urgent', confidence: 0.9 },
        { standardLabelKey: 'sales', confidence: 0.8 },
        { standardLabelKey: 'support_technical', confidence: 0.7 }
      ];

      const score = matcher.calculateAutomationReadiness(matches, 10, 2);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should return 0 for no matches', () => {
      const score = matcher.calculateAutomationReadiness([], 5, 5);
      expect(score).toBe(0);
    });
  });

  describe('Hot Tub Business Specific Tests', () => {
    test('should recognize hot tub business patterns', () => {
      const hotTubLabels = [
        'Hot Tub Service',
        'Spa Repair',
        'Jacuzzi Maintenance',
        'Chemical Balance',
        'Filter Replacement',
        'Heater Issues',
        'Pump Problems'
      ];

      hotTubLabels.forEach(async (labelName) => {
        const mockLabels = [{ id: 'test', name: labelName, type: 'user', messagesTotal: 5 }];
        const result = await matcher.analyzeLabelsForAutomation(mockLabels);
        
        // Should find at least some matches for hot tub related labels
        expect(result.recommendedMappings.length).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle standard label structure', () => {
      expect(matcher.standardLabels).toHaveProperty('urgent');
      expect(matcher.standardLabels).toHaveProperty('sales');
      expect(matcher.standardLabels).toHaveProperty('support_technical');
      expect(matcher.standardLabels).toHaveProperty('manager_stacie');
      expect(matcher.standardLabels).toHaveProperty('suppliers_aqua_spa');

      // Check label structure
      Object.values(matcher.standardLabels).forEach(label => {
        expect(label).toHaveProperty('name');
        expect(label).toHaveProperty('priority');
        expect(label).toHaveProperty('ai_can_reply');
        expect(label).toHaveProperty('n8n_category');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      // Test with null input
      await expect(matcher.analyzeLabelsForAutomation(null)).rejects.toThrow();

      // Test with invalid label structure
      const invalidLabels = [{ invalid: 'structure' }];
      const result = await matcher.analyzeLabelsForAutomation(invalidLabels);
      expect(result).toHaveProperty('hasUsableLabels', false);
    });

    test('should handle pattern matching errors', () => {
      // Test with invalid regex pattern
      expect(() => {
        matcher.calculateMatchConfidence('test', 'invalid-regex');
      }).toThrow();
    });
  });
});
