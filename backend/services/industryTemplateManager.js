const { getSupabaseAdmin } = require('../../api/_lib/database');

class IndustryTemplateManager {
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }

  async loadTemplates() {
    const supabase = getSupabaseAdmin();
    const { data: industries } = await supabase
      .from('industries')
      .select('*')
      .eq('is_active', true);

    industries?.forEach(industry => {
      this.templates.set(industry.slug, industry);
    });
  }

  /**
   * Get industry-specific email patterns and AI prompts
   */
  getIndustryTemplate(industrySlug) {
    return this.templates.get(industrySlug) || this.getDefaultTemplate();
  }

  /**
   * Hot Tub & Spa Industry Template (existing)
   */
  getHotTubTemplate() {
    return {
      slug: 'hot-tub-spa',
      name: 'Hot Tub & Spa Services',
      emailPatterns: {
        urgent: /urgent|emergency|broken.*down|leak|not.*heating|won.*t.*work|no.*power/i,
        sales: /quote|estimate|price|cost|new.*hot.*tub|installation|buy|purchase/i,
        service_technical: /repair|fix|broken|malfunction|error|troubleshoot|diagnostic|pump.*not.*working/i,
        service_maintenance: /maintenance|clean|service.*call|regular.*service|tune.*up/i,
        parts_chemicals: /parts|chemicals|supplies|filter|chlorine|bromine|ph|alkalinity|ozone/i,
        seasonal: /winter|winteriz|close|open|season|cover|drain/i,
        warranty: /warranty|guarantee|defect|replacement.*part/i
      },
      standardLabels: [
        'Urgent', 'Sales', 'Support - Technical', 'Support - Maintenance',
        'Support - Parts & Chemicals', 'Support - Seasonal', 'Banking',
        'Manager', 'Suppliers', 'FormSub', 'Phone', 'Misc'
      ],
      aiSystemPrompt: `You are an expert email processing system for hot tub and spa businesses.
      
Classify emails into these categories:
- Urgent: Emergency repairs, broken equipment, leaks, heating issues
- Sales: New customer inquiries, quotes, installations
- Support-Technical: Repair requests, troubleshooting, diagnostics
- Support-Maintenance: Regular service, cleaning, tune-ups
- Support-PartsChemicals: Parts orders, chemical supplies, filters
- Support-Seasonal: Winterization, opening/closing, covers
- Banking: Payments, invoices, financial matters
- Manager: Complaints, escalations, management issues`,
      businessTerms: [
        'hot tub', 'spa', 'jacuzzi', 'whirlpool', 'jets', 'heater', 'pump', 'filter',
        'chemicals', 'chlorine', 'bromine', 'ph', 'alkalinity', 'cover', 'ozone'
      ]
    };
  }

  /**
   * HVAC Industry Template (new expansion)
   */
  getHVACTemplate() {
    return {
      slug: 'hvac',
      name: 'HVAC Services',
      emailPatterns: {
        urgent: /no.*heat|no.*cooling|emergency|broken.*furnace|ac.*not.*working|freezing|too.*hot/i,
        sales: /quote|estimate|new.*system|replacement|install.*hvac|upgrade/i,
        service_heating: /furnace|heating|boiler|heat.*pump|no.*heat|cold/i,
        service_cooling: /air.*conditioning|ac|cooling|too.*hot|not.*cooling/i,
        service_maintenance: /maintenance|tune.*up|service.*call|annual.*service|inspection/i,
        parts: /parts|filter|thermostat|ductwork|compressor|coil/i,
        seasonal: /spring.*tune|fall.*maintenance|winter.*prep|summer.*ready/i,
        warranty: /warranty|guarantee|defect|replacement.*part/i
      },
      standardLabels: [
        'Emergency', 'Sales', 'Service - Heating', 'Service - Cooling',
        'Maintenance', 'Parts', 'Installation', 'Manager', 'Suppliers', 'Banking'
      ],
      aiSystemPrompt: `You are an expert email processing system for HVAC businesses.
      
Classify emails into these categories:
- Emergency: No heat/cooling, broken equipment, urgent repairs
- Sales: New system quotes, replacements, upgrades
- Service-Heating: Furnace, boiler, heat pump issues
- Service-Cooling: Air conditioning, cooling problems
- Maintenance: Tune-ups, inspections, preventive service
- Parts: Filters, thermostats, ductwork, components
- Installation: New system installations, ductwork
- Manager: Complaints, escalations, management issues`,
      businessTerms: [
        'hvac', 'furnace', 'air conditioning', 'ac', 'heat pump', 'boiler',
        'thermostat', 'ductwork', 'filter', 'compressor', 'coil', 'refrigerant'
      ]
    };
  }

  /**
   * Plumbing Industry Template (new expansion)
   */
  getPlumbingTemplate() {
    return {
      slug: 'plumbing',
      name: 'Plumbing Services',
      emailPatterns: {
        urgent: /emergency|burst.*pipe|flood|leak|no.*water|sewer.*backup|toilet.*overflow/i,
        sales: /quote|estimate|bathroom.*remodel|kitchen.*remodel|new.*installation/i,
        service_repair: /repair|fix|broken|leak|clog|drain.*cleaning|pipe.*repair/i,
        service_maintenance: /maintenance|inspection|annual.*service|preventive/i,
        installation: /install|installation|new.*fixture|water.*heater|toilet|sink/i,
        parts: /parts|fixture|pipe|valve|faucet|toilet.*parts/i,
        warranty: /warranty|guarantee|defect|callback/i
      },
      standardLabels: [
        'Emergency', 'Sales', 'Service - Repair', 'Service - Maintenance',
        'Installation', 'Parts', 'Manager', 'Suppliers', 'Banking'
      ],
      aiSystemPrompt: `You are an expert email processing system for plumbing businesses.
      
Classify emails into these categories:
- Emergency: Burst pipes, floods, sewer backups, no water
- Sales: Remodeling quotes, new installations
- Service-Repair: Leak repairs, clogs, drain cleaning
- Service-Maintenance: Inspections, preventive maintenance
- Installation: New fixtures, water heaters, appliances
- Parts: Pipes, valves, fixtures, components
- Manager: Complaints, escalations, management issues`,
      businessTerms: [
        'plumbing', 'pipe', 'leak', 'drain', 'toilet', 'sink', 'faucet',
        'water heater', 'sewer', 'valve', 'fixture', 'clog', 'flood'
      ]
    };
  }

  /**
   * Landscaping Industry Template (new expansion)
   */
  getLandscapingTemplate() {
    return {
      slug: 'landscaping',
      name: 'Landscaping Services',
      emailPatterns: {
        urgent: /emergency|storm.*damage|tree.*down|irrigation.*broken|flood/i,
        sales: /quote|estimate|landscape.*design|new.*project|installation/i,
        maintenance: /lawn.*care|mowing|trimming|pruning|weeding|maintenance/i,
        irrigation: /sprinkler|irrigation|watering.*system|drip.*system/i,
        seasonal: /spring.*cleanup|fall.*cleanup|winter.*prep|leaf.*removal/i,
        installation: /install|planting|sod|mulch|hardscape|patio/i,
        tree_service: /tree.*removal|tree.*trimming|stump.*grinding|arborist/i
      },
      standardLabels: [
        'Emergency', 'Sales', 'Maintenance', 'Irrigation', 'Seasonal',
        'Installation', 'Tree Service', 'Manager', 'Suppliers', 'Banking'
      ],
      aiSystemPrompt: `You are an expert email processing system for landscaping businesses.
      
Classify emails into these categories:
- Emergency: Storm damage, fallen trees, irrigation failures
- Sales: Design quotes, new projects, installations
- Maintenance: Lawn care, mowing, trimming, regular upkeep
- Irrigation: Sprinkler systems, watering issues
- Seasonal: Spring/fall cleanup, seasonal preparations
- Installation: Planting, sod, hardscaping, patios
- TreeService: Tree removal, trimming, stump grinding`,
      businessTerms: [
        'landscaping', 'lawn', 'grass', 'tree', 'plant', 'garden', 'irrigation',
        'sprinkler', 'mulch', 'sod', 'pruning', 'trimming', 'hardscape'
      ]
    };
  }

  /**
   * Generate industry-specific business form
   */
  generateIndustryForm(industrySlug) {
    const template = this.getIndustryTemplate(industrySlug);
    
    const baseFields = this.getBaseBusinessFields();
    const industryFields = this.getIndustrySpecificFields(industrySlug);
    
    return {
      title: `Complete Your ${template.name} Business Profile`,
      description: `Customize your email automation for ${template.name.toLowerCase()}.`,
      sections: [
        {
          title: 'Company Information',
          fields: baseFields
        },
        {
          title: `${template.name} Details`,
          fields: industryFields
        }
      ]
    };
  }

  getBaseBusinessFields() {
    return [
      {
        id: 'company_name',
        label: 'Company Name',
        type: 'text',
        required: true,
        tooltip: 'Your company name will appear in all automated email responses and signatures.'
      },
      {
        id: 'business_phone',
        label: 'Business Phone',
        type: 'tel',
        required: true,
        tooltip: 'Primary contact number that customers will see in automated responses.'
      },
      {
        id: 'business_address',
        label: 'Business Address',
        type: 'textarea',
        required: true,
        tooltip: 'Your business address helps calculate service areas and appears in email signatures.'
      }
    ];
  }

  getIndustrySpecificFields(industrySlug) {
    switch (industrySlug) {
      case 'hot-tub-spa':
        return this.getHotTubFields();
      case 'hvac':
        return this.getHVACFields();
      case 'plumbing':
        return this.getPlumbingFields();
      case 'landscaping':
        return this.getLandscapingFields();
      default:
        return this.getGenericFields();
    }
  }

  getHotTubFields() {
    return [
      {
        id: 'service_area_radius',
        label: 'Service Area Radius (miles)',
        type: 'number',
        required: true,
        tooltip: 'Maximum distance you travel for hot tub service calls.'
      },
      {
        id: 'primary_services',
        label: 'Primary Services',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'installation', label: 'Hot Tub Installation & Setup' },
          { value: 'repair', label: 'Repair & Troubleshooting' },
          { value: 'maintenance', label: 'Regular Maintenance & Cleaning' },
          { value: 'water_care', label: 'Water Testing & Chemical Balancing' },
          { value: 'winterization', label: 'Winterization & Seasonal Prep' }
        ],
        tooltip: 'Select all hot tub services your business provides.'
      }
    ];
  }

  getHVACFields() {
    return [
      {
        id: 'service_area_radius',
        label: 'Service Area Radius (miles)',
        type: 'number',
        required: true,
        tooltip: 'Maximum distance you travel for HVAC service calls.'
      },
      {
        id: 'primary_services',
        label: 'HVAC Services',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'heating_repair', label: 'Heating System Repair' },
          { value: 'cooling_repair', label: 'Air Conditioning Repair' },
          { value: 'installation', label: 'New System Installation' },
          { value: 'maintenance', label: 'Preventive Maintenance' },
          { value: 'ductwork', label: 'Ductwork Services' }
        ],
        tooltip: 'Select all HVAC services your business provides.'
      },
      {
        id: 'emergency_service',
        label: 'Offer 24/7 Emergency Service?',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes - 24/7 emergency service available' },
          { value: 'no', label: 'No - business hours only' }
        ],
        tooltip: 'Do you provide emergency HVAC service outside business hours?'
      }
    ];
  }

  getDefaultTemplate() {
    return this.getHotTubTemplate(); // Fallback to hot tub template
  }
}

module.exports = IndustryTemplateManager;
