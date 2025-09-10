const express = require('express');

const router = express.Router();
const N8nWorkflowGenerator = require('../services/n8nWorkflowGenerator');

/**
 * 🚀 DEMO API ENDPOINT: Generate Personalized n8n Workflows
 * 
 * This endpoint demonstrates how easy it is to generate workflows
 * for different businesses using your existing n8n template structure.
 */

// Initialize the generator
const generator = new N8nWorkflowGenerator();

/**
 * POST /api/demo/generate-workflow
 * Generate a personalized n8n workflow for any business
 */
router.post('/generate-workflow', async (req, res) => {
  try {
    const {
      businessData,
      customManagers = [],
      customSuppliers = [],
      phoneSystem = 'RingCentral'
    } = req.body;

    // Validate required business data
    if (!businessData || !businessData.company_name) {
      return res.status(400).json({
        error: 'Business data with company_name is required',
        example: {
          businessData: {
            user_id: 'demo_001',
            company_name: 'Your Business Name',
            business_phone: '(555) 123-4567',
            business_email: 'service@yourbusiness.com',
            industry: 'hot-tub-spa' // or 'hvac', 'plumbing', 'landscaping'
          },
          customManagers: ['Manager 1', 'Manager 2'],
          customSuppliers: ['Supplier 1', 'Supplier 2'],
          phoneSystem: 'RingCentral'
        }
      });
    }

    // Generate the personalized workflow
    const personalizedWorkflow = await generator.generatePersonalizedWorkflow(
      businessData,
      {}, // labelMappings - can be empty for demo
      customManagers,
      customSuppliers,
      phoneSystem
    );

    // Return workflow summary and key details
    res.json({
      success: true,
      message: 'Workflow generated successfully!',
      workflow: {
        name: personalizedWorkflow.name,
        totalNodes: personalizedWorkflow.nodes.length,
        nodeTypes: {
          gmailTrigger: personalizedWorkflow.nodes.filter(n => n.type === 'n8n-nodes-base.gmailTrigger').length,
          aiClassifier: personalizedWorkflow.nodes.filter(n => n.type === '@n8n/n8n-nodes-langchain.chatOpenAi').length,
          switchNode: personalizedWorkflow.nodes.filter(n => n.type === 'n8n-nodes-base.switch').length,
          labelNodes: personalizedWorkflow.nodes.filter(n => n.type === 'n8n-nodes-base.gmail').length,
          customManagers: personalizedWorkflow.nodes.filter(n => n.id && n.id.startsWith('manager-')).length,
          customSuppliers: personalizedWorkflow.nodes.filter(n => n.id && n.id.startsWith('supplier-')).length
        },
        connections: Object.keys(personalizedWorkflow.connections).length,
        businessInfo: {
          company: businessData.company_name,
          industry: businessData.industry || 'service-business',
          managers: customManagers.slice(0, 5),
          suppliers: customSuppliers.slice(0, 10),
          phoneSystem: phoneSystem
        },
        readyToDeploy: true
      },
      // Include a sample of the AI system message to show personalization
      aiSystemMessagePreview: personalizedWorkflow.nodes
        .find(n => n.type === '@n8n/n8n-nodes-langchain.chatOpenAi')
        ?.parameters?.options?.systemMessage?.substring(0, 200) + '...',
      
      // Show Gmail filter to demonstrate business-specific filtering
      gmailFilter: personalizedWorkflow.nodes
        .find(n => n.type === 'n8n-nodes-base.gmailTrigger')
        ?.parameters?.filters?.q,
      
      // Full workflow available for n8n deployment
      fullWorkflow: personalizedWorkflow
    });

  } catch (error) {
    console.error('Error generating workflow:', error);
    res.status(500).json({
      error: 'Failed to generate workflow',
      message: error.message
    });
  }
});

/**
 * GET /api/demo/sample-businesses
 * Get sample business data for different industries
 */
router.get('/sample-businesses', (req, res) => {
  const sampleBusinesses = {
    'hot-tub-spa': {
      businessData: {
        user_id: 'demo_hottub',
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
      },
      customManagers: ['Hailey', 'Jillian', 'Stacie', 'Aaron'],
      customSuppliers: ['Aqua Spa Pool Supply', 'Paradise Patio Furniture Ltd', 'Strong Spas'],
      phoneSystem: 'RingCentral'
    },
    
    'hvac': {
      businessData: {
        user_id: 'demo_hvac',
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
      },
      customManagers: ['Mike Johnson', 'Sarah Chen', 'Tom Rodriguez'],
      customSuppliers: ['Carrier Parts Direct', 'Trane Supply Co', 'Honeywell Wholesale'],
      phoneSystem: 'Vonage'
    },
    
    'plumbing': {
      businessData: {
        user_id: 'demo_plumbing',
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
      },
      customManagers: ['Carlos Martinez', 'Lisa Wong'],
      customSuppliers: ['Ferguson Plumbing', 'Home Depot Pro', 'Local Pipe Supply', 'Emergency Parts Co'],
      phoneSystem: 'Google Voice'
    },
    
    'landscaping': {
      businessData: {
        user_id: 'demo_landscaping',
        company_name: 'Green Thumb Landscaping',
        business_phone: '(555) GARDENS',
        business_address: '321 Garden Way, Greenville, OR 97001',
        service_area_radius: 40,
        business_hours: 'Mon-Sat 6AM-8PM',
        response_time_goal: '24_hours',
        primary_services: ['lawn_care', 'landscaping', 'tree_service', 'irrigation'],
        industry: 'landscaping',
        business_email: 'info@greenthumblandscaping.com'
      },
      customManagers: ['Maria Rodriguez', 'Jake Thompson', 'Amy Chen'],
      customSuppliers: ['Landscape Supply Co', 'Tree Nursery Direct', 'Irrigation Wholesale'],
      phoneSystem: 'RingCentral'
    }
  };

  res.json({
    success: true,
    message: 'Sample business data for different industries',
    industries: Object.keys(sampleBusinesses),
    samples: sampleBusinesses,
    usage: {
      endpoint: 'POST /api/demo/generate-workflow',
      description: 'Use any of these sample businesses to generate a personalized workflow',
      example: 'Send the entire sample object as the request body'
    }
  });
});

/**
 * POST /api/demo/quick-generate/:industry
 * Quick workflow generation using predefined industry samples
 */
router.post('/quick-generate/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    
    // Get sample data for the industry
    const sampleResponse = await new Promise((resolve) => {
      router.handle({ method: 'GET', url: '/sample-businesses' }, { 
        json: resolve 
      });
    });
    
    const sampleData = sampleResponse.samples[industry];
    
    if (!sampleData) {
      return res.status(400).json({
        error: `Industry '${industry}' not supported`,
        supportedIndustries: ['hot-tub-spa', 'hvac', 'plumbing', 'landscaping']
      });
    }

    // Generate workflow using sample data
    const personalizedWorkflow = await generator.generatePersonalizedWorkflow(
      sampleData.businessData,
      {},
      sampleData.customManagers,
      sampleData.customSuppliers,
      sampleData.phoneSystem
    );

    res.json({
      success: true,
      message: `${industry.toUpperCase()} workflow generated successfully!`,
      industry: industry,
      workflow: {
        name: personalizedWorkflow.name,
        totalNodes: personalizedWorkflow.nodes.length,
        readyToDeploy: true
      },
      sampleDataUsed: sampleData,
      fullWorkflow: personalizedWorkflow
    });

  } catch (error) {
    console.error('Error in quick generate:', error);
    res.status(500).json({
      error: 'Failed to generate workflow',
      message: error.message
    });
  }
});

module.exports = router;
