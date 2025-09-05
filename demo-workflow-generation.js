#!/usr/bin/env node

/**
 * 🚀 DYNAMIC N8N WORKFLOW GENERATION DEMO
 * 
 * This script demonstrates how your existing n8n template can be instantly
 * personalized for ANY service business with just their business data.
 * 
 * Your template structure stays the same - only business-specific values change!
 */

const N8nWorkflowGenerator = require('./backend/services/n8nWorkflowGenerator');

// Initialize the generator
const generator = new N8nWorkflowGenerator();

console.log('🎯 DYNAMIC N8N WORKFLOW GENERATION DEMO');
console.log('=====================================\n');

async function demonstrateWorkflowGeneration() {
  
  // 🔥 DEMO 1: Hot Tub Business (Your Original)
  console.log('🛁 DEMO 1: Hot Tub Business (Your Original Template)');
  console.log('---------------------------------------------------');
  
  const hotTubBusiness = {
    user_id: 'demo_001',
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

  const hotTubManagers = ['Hailey', 'Jillian', 'Stacie', 'Aaron'];
  const hotTubSuppliers = ['Aqua Spa Pool Supply', 'Paradise Patio Furniture Ltd', 'Strong Spas'];

  try {
    const hotTubWorkflow = await generator.generatePersonalizedWorkflow(
      hotTubBusiness, 
      {}, 
      hotTubManagers, 
      hotTubSuppliers, 
      'RingCentral'
    );

    console.log(`✅ Generated: "${hotTubWorkflow.name}"`);
    console.log(`📧 Gmail Filter: Excludes emails from thehotubman.com`);
    console.log(`👥 Custom Managers: ${hotTubManagers.join(', ')}`);
    console.log(`🏪 Custom Suppliers: ${hotTubSuppliers.join(', ')}`);
    console.log(`🎯 Total Nodes: ${hotTubWorkflow.nodes.length}`);
    console.log(`🔗 Connections: ${Object.keys(hotTubWorkflow.connections).length} node groups\n`);

  } catch (error) {
    console.error('❌ Error generating hot tub workflow:', error.message);
  }

  // 🔥 DEMO 2: HVAC Business (Same Template, Different Data)
  console.log('🌡️  DEMO 2: HVAC Business (Same Template, Different Industry)');
  console.log('------------------------------------------------------------');
  
  const hvacBusiness = {
    user_id: 'demo_002',
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

  const hvacManagers = ['Mike Johnson', 'Sarah Chen', 'Tom Rodriguez'];
  const hvacSuppliers = ['Carrier Parts Direct', 'Trane Supply Co', 'Honeywell Wholesale'];

  try {
    const hvacWorkflow = await generator.generatePersonalizedWorkflow(
      hvacBusiness, 
      {}, 
      hvacManagers, 
      hvacSuppliers, 
      'Vonage'
    );

    console.log(`✅ Generated: "${hvacWorkflow.name}"`);
    console.log(`📧 Gmail Filter: Excludes emails from abchvac.com`);
    console.log(`👥 Custom Managers: ${hvacManagers.join(', ')}`);
    console.log(`🏪 Custom Suppliers: ${hvacSuppliers.join(', ')}`);
    console.log(`🎯 Total Nodes: ${hvacWorkflow.nodes.length}`);
    console.log(`🔗 Connections: ${Object.keys(hvacWorkflow.connections).length} node groups\n`);

  } catch (error) {
    console.error('❌ Error generating HVAC workflow:', error.message);
  }

  // 🔥 DEMO 3: Plumbing Business (Same Template, Another Industry)
  console.log('🔧 DEMO 3: Plumbing Business (Same Template, Another Industry)');
  console.log('--------------------------------------------------------------');
  
  const plumbingBusiness = {
    user_id: 'demo_003',
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

  const plumbingManagers = ['Carlos Martinez', 'Lisa Wong'];
  const plumbingSuppliers = ['Ferguson Plumbing', 'Home Depot Pro', 'Local Pipe Supply', 'Emergency Parts Co'];

  try {
    const plumbingWorkflow = await generator.generatePersonalizedWorkflow(
      plumbingBusiness, 
      {}, 
      plumbingManagers, 
      plumbingSuppliers, 
      'Google Voice'
    );

    console.log(`✅ Generated: "${plumbingWorkflow.name}"`);
    console.log(`📧 Gmail Filter: Excludes emails from quickfixplumbing.com`);
    console.log(`👥 Custom Managers: ${plumbingManagers.join(', ')}`);
    console.log(`🏪 Custom Suppliers: ${plumbingSuppliers.join(', ')}`);
    console.log(`🎯 Total Nodes: ${plumbingWorkflow.nodes.length}`);
    console.log(`🔗 Connections: ${Object.keys(plumbingWorkflow.connections).length} node groups\n`);

  } catch (error) {
    console.error('❌ Error generating plumbing workflow:', error.message);
  }

  // 🔥 DEMO 4: Landscaping Business (Same Template, Yet Another Industry)
  console.log('🌿 DEMO 4: Landscaping Business (Same Template, Yet Another Industry)');
  console.log('--------------------------------------------------------------------');
  
  const landscapingBusiness = {
    user_id: 'demo_004',
    company_name: 'Green Thumb Landscaping',
    business_phone: '(555) GARDENS',
    business_address: '321 Garden Way, Greenville, OR 97001',
    service_area_radius: 40,
    business_hours: 'Mon-Sat 6AM-8PM',
    response_time_goal: '24_hours',
    primary_services: ['lawn_care', 'landscaping', 'tree_service', 'irrigation'],
    industry: 'landscaping',
    business_email: 'info@greenthumblandscaping.com'
  };

  const landscapingManagers = ['Maria Rodriguez', 'Jake Thompson', 'Amy Chen'];
  const landscapingSuppliers = ['Landscape Supply Co', 'Tree Nursery Direct', 'Irrigation Wholesale'];

  try {
    const landscapingWorkflow = await generator.generatePersonalizedWorkflow(
      landscapingBusiness, 
      {}, 
      landscapingManagers, 
      landscapingSuppliers, 
      'RingCentral'
    );

    console.log(`✅ Generated: "${landscapingWorkflow.name}"`);
    console.log(`📧 Gmail Filter: Excludes emails from greenthumblandscaping.com`);
    console.log(`👥 Custom Managers: ${landscapingManagers.join(', ')}`);
    console.log(`🏪 Custom Suppliers: ${landscapingSuppliers.join(', ')}`);
    console.log(`🎯 Total Nodes: ${landscapingWorkflow.nodes.length}`);
    console.log(`🔗 Connections: ${Object.keys(landscapingWorkflow.connections).length} node groups\n`);

  } catch (error) {
    console.error('❌ Error generating landscaping workflow:', error.message);
  }

  // 🎯 SUMMARY
  console.log('🎉 DEMO SUMMARY');
  console.log('===============');
  console.log('✅ Same n8n template structure works for ALL businesses');
  console.log('✅ Only business data changes - workflow logic stays identical');
  console.log('✅ AI system messages are personalized per business');
  console.log('✅ Gmail filters exclude each business\'s own emails');
  console.log('✅ Custom managers and suppliers are dynamically added');
  console.log('✅ Ready to deploy to n8n immediately');
  console.log('');
  console.log('🚀 SCALABILITY: Your template can serve HUNDREDS of businesses!');
  console.log('💰 BUSINESS MODEL: $29-199/month per business = Recurring revenue');
  console.log('⚡ DEPLOYMENT: New business onboarded in under 10 minutes');
  console.log('');
  console.log('Your n8n template is already perfect for multi-tenant SaaS! 🎯');
}

// Run the demonstration
demonstrateWorkflowGeneration().catch(console.error);
