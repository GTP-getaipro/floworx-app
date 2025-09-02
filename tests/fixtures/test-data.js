/**
 * Test Data Fixtures for FloWorx E2E Tests
 * Provides consistent test data across all test suites
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * User test data
 */
const users = {
  valid: {
    id: uuidv4(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@floworx-e2e.com',
    password: 'TestPass123!',
    businessName: 'Test Hot Tub Services',
    businessType: 'hot_tub',
    emailVerified: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  
  admin: {
    id: uuidv4(),
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@floworx-e2e.com',
    password: 'AdminPass123!',
    businessName: 'Admin Business Services',
    businessType: 'hot_tub',
    role: 'admin',
    emailVerified: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  
  unverified: {
    id: uuidv4(),
    firstName: 'Unverified',
    lastName: 'User',
    email: 'unverified@floworx-e2e.com',
    password: 'UnverifiedPass123!',
    businessName: 'Unverified Business',
    businessType: 'spa',
    emailVerified: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  
  locked: {
    id: uuidv4(),
    firstName: 'Locked',
    lastName: 'User',
    email: 'locked@floworx-e2e.com',
    password: 'LockedPass123!',
    businessName: 'Locked Business',
    businessType: 'pool',
    emailVerified: true,
    failedLoginAttempts: 5,
    lockedUntil: new Date(Date.now() + 900000), // 15 minutes from now
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }
};

/**
 * Business configuration test data
 */
const businessConfigurations = {
  hotTub: {
    id: uuidv4(),
    userId: users.valid.id,
    businessName: 'Premium Hot Tub Services',
    businessType: 'hot_tub',
    businessDescription: 'Full-service hot tub maintenance, repair, and installation',
    website: 'https://premium-hottubs.com',
    phone: '(555) 123-4567',
    address: {
      street: '123 Spa Lane',
      city: 'Wellness City',
      state: 'CA',
      zipCode: '90210',
      country: 'US'
    },
    settings: {
      autoResponse: true,
      businessHours: {
        enabled: true,
        timezone: 'America/Los_Angeles',
        schedule: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '10:00', end: '14:00' }
        }
      },
      responseDelay: 300,
      escalationRules: [
        {
          condition: 'no_response_24h',
          action: 'notify_manager',
          delay: 86400
        }
      ]
    },
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }
};

/**
 * Workflow test data
 */
const workflows = {
  inquiryResponse: {
    id: uuidv4(),
    userId: users.valid.id,
    name: 'Customer Inquiry Auto-Response',
    description: 'Automatically respond to customer inquiries and create follow-up tasks',
    triggerType: 'inquiry',
    configuration: {
      steps: [
        {
          type: 'auto_response',
          template: 'Thank you for your inquiry about our hot tub services. We will respond within 24 hours.',
          delay: 0
        },
        {
          type: 'create_task',
          assignTo: 'customer_service',
          priority: 'medium',
          delay: 300
        },
        {
          type: 'follow_up',
          delay: 86400,
          template: 'Following up on your hot tub inquiry. How can we help you further?'
        }
      ],
      conditions: {
        businessHours: true,
        autoStart: true
      }
    },
    status: 'active',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  
  serviceRequest: {
    id: uuidv4(),
    userId: users.valid.id,
    name: 'Service Request Handler',
    description: 'Process service requests and schedule appointments',
    triggerType: 'service_request',
    configuration: {
      steps: [
        {
          type: 'auto_response',
          template: 'We received your service request. A technician will contact you within 2 hours.',
          delay: 0
        },
        {
          type: 'notify_team',
          recipients: ['service@floworx-e2e.com'],
          delay: 0
        },
        {
          type: 'schedule_appointment',
          delay: 7200
        }
      ],
      conditions: {
        businessHours: true,
        priority: 'high'
      }
    },
    status: 'active',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  
  complaintHandler: {
    id: uuidv4(),
    userId: users.valid.id,
    name: 'Complaint Escalation',
    description: 'Handle customer complaints with immediate escalation',
    triggerType: 'complaint',
    configuration: {
      steps: [
        {
          type: 'auto_response',
          template: 'We sincerely apologize for any inconvenience. A manager will contact you immediately.',
          delay: 0
        },
        {
          type: 'escalate',
          assignTo: 'manager',
          priority: 'urgent',
          delay: 0
        },
        {
          type: 'notify_team',
          recipients: ['manager@floworx-e2e.com', 'support@floworx-e2e.com'],
          delay: 0
        }
      ],
      conditions: {
        priority: 'urgent',
        autoStart: true
      }
    },
    status: 'active',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }
};

/**
 * Workflow execution test data
 */
const workflowExecutions = [
  {
    id: uuidv4(),
    workflowId: workflows.inquiryResponse.id,
    userId: users.valid.id,
    status: 'success',
    inputData: {
      emailId: 'email-001',
      from: 'customer1@example.com',
      subject: 'Hot tub maintenance question',
      body: 'I need help with my hot tub maintenance schedule.'
    },
    outputData: {
      responsesSent: 1,
      tasksCreated: 1,
      followUpScheduled: true
    },
    startedAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: new Date('2024-01-15T10:05:00Z'),
    duration: 300000,
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: uuidv4(),
    workflowId: workflows.serviceRequest.id,
    userId: users.valid.id,
    status: 'running',
    inputData: {
      emailId: 'email-002',
      from: 'customer2@example.com',
      subject: 'Service appointment needed',
      body: 'My hot tub needs repair. Please schedule a service call.'
    },
    startedAt: new Date('2024-01-15T14:00:00Z'),
    createdAt: new Date('2024-01-15T14:00:00Z')
  }
];

/**
 * Analytics events test data
 */
const analyticsEvents = [
  {
    id: uuidv4(),
    userId: users.valid.id,
    eventType: 'workflow_executed',
    eventData: {
      workflowId: workflows.inquiryResponse.id,
      duration: 300000,
      status: 'success',
      stepsCompleted: 3
    },
    metadata: {
      source: 'gmail',
      version: '1.0.0'
    },
    createdAt: new Date('2024-01-15T10:05:00Z')
  },
  {
    id: uuidv4(),
    userId: users.valid.id,
    eventType: 'email_processed',
    eventData: {
      emailId: 'email-001',
      processingTime: 250,
      classification: 'inquiry',
      confidence: 0.95
    },
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: uuidv4(),
    userId: users.valid.id,
    eventType: 'user_action',
    eventData: {
      action: 'login',
      timestamp: new Date('2024-01-15T09:00:00Z').toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    },
    createdAt: new Date('2024-01-15T09:00:00Z')
  }
];

/**
 * Onboarding progress test data
 */
const onboardingProgress = {
  completed: {
    id: uuidv4(),
    userId: users.valid.id,
    currentStep: 'completed',
    stepsCompleted: [
      'business_info',
      'gmail_connection',
      'label_mapping',
      'team_notifications',
      'workflow_preferences',
      'review'
    ],
    stepData: {
      business_info: {
        businessName: 'Test Hot Tub Services',
        businessType: 'hot_tub',
        completedAt: new Date('2024-01-01T10:00:00Z')
      },
      gmail_connection: {
        connected: true,
        email: 'business@floworx-e2e.com',
        completedAt: new Date('2024-01-01T10:15:00Z')
      },
      label_mapping: {
        mappings: [
          {
            gmailLabel: 'Customer Inquiries',
            triggerType: 'inquiry',
            priority: 'medium'
          }
        ],
        completedAt: new Date('2024-01-01T10:30:00Z')
      }
    },
    completedAt: new Date('2024-01-01T11:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z')
  }
};

/**
 * Database seeding functions
 */
async function seedUsers(dbClient) {
  console.log('Seeding users...');
  
  for (const [key, userData] of Object.entries(users)) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await dbClient.query(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash, 
        email_verified, failed_login_attempts, locked_until,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $5,
        email_verified = $6,
        failed_login_attempts = $7,
        locked_until = $8,
        updated_at = $10
    `, [
      userData.id,
      userData.firstName,
      userData.lastName,
      userData.email,
      hashedPassword,
      userData.emailVerified,
      userData.failedLoginAttempts || 0,
      userData.lockedUntil || null,
      userData.createdAt,
      userData.updatedAt
    ]);
  }
  
  console.log(`✅ Seeded ${Object.keys(users).length} users`);
}

async function seedBusinessConfigurations(dbClient) {
  console.log('Seeding business configurations...');
  
  for (const [key, config] of Object.entries(businessConfigurations)) {
    await dbClient.query(`
      INSERT INTO business_configurations (
        id, user_id, business_name, business_type, business_description,
        website, phone, address, settings, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        business_name = $3,
        business_type = $4,
        business_description = $5,
        website = $6,
        phone = $7,
        address = $8,
        settings = $9,
        is_active = $10,
        updated_at = $12
    `, [
      config.id,
      config.userId,
      config.businessName,
      config.businessType,
      config.businessDescription,
      config.website,
      config.phone,
      JSON.stringify(config.address),
      JSON.stringify(config.settings),
      config.isActive,
      config.createdAt,
      config.updatedAt
    ]);
  }
  
  console.log(`✅ Seeded ${Object.keys(businessConfigurations).length} business configurations`);
}

async function seedWorkflows(dbClient) {
  console.log('Seeding workflows...');
  
  for (const [key, workflow] of Object.entries(workflows)) {
    await dbClient.query(`
      INSERT INTO workflows (
        id, user_id, name, description, trigger_type, configuration,
        status, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = $3,
        description = $4,
        configuration = $6,
        status = $7,
        is_active = $8,
        updated_at = $10
    `, [
      workflow.id,
      workflow.userId,
      workflow.name,
      workflow.description,
      workflow.triggerType,
      JSON.stringify(workflow.configuration),
      workflow.status,
      workflow.isActive,
      workflow.createdAt,
      workflow.updatedAt
    ]);
  }
  
  console.log(`✅ Seeded ${Object.keys(workflows).length} workflows`);
}

async function seedAnalyticsEvents(dbClient) {
  console.log('Seeding analytics events...');
  
  for (const event of analyticsEvents) {
    await dbClient.query(`
      INSERT INTO analytics_events (
        id, user_id, event_type, event_data, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      event.id,
      event.userId,
      event.eventType,
      JSON.stringify(event.eventData),
      JSON.stringify(event.metadata || {}),
      event.createdAt
    ]);
  }
  
  console.log(`✅ Seeded ${analyticsEvents.length} analytics events`);
}

async function seedAllTestData(dbClient) {
  console.log('🌱 Seeding all test data...');
  
  try {
    await seedUsers(dbClient);
    await seedBusinessConfigurations(dbClient);
    await seedWorkflows(dbClient);
    await seedAnalyticsEvents(dbClient);
    
    console.log('✅ All test data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

module.exports = {
  users,
  businessConfigurations,
  workflows,
  workflowExecutions,
  analyticsEvents,
  onboardingProgress,
  seedUsers,
  seedBusinessConfigurations,
  seedWorkflows,
  seedAnalyticsEvents,
  seedAllTestData
};
