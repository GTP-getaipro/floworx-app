import { authenticateToken } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/database.js';

// GET /api/onboarding/status
// Get user's onboarding progress
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  // Use the authentication middleware
  authenticateToken(req, res, async () => {
    try {
      const userId = req.user.id;
      const supabase = getSupabaseAdmin();

      // Get user's basic info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, email_verified, onboarding_completed, first_name, company_name')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if Google is connected
      const { data: credentials, error: credError } = await supabase
        .from('credentials')
        .select('id, service_name, created_at')
        .eq('user_id', userId)
        .eq('service_name', 'google');

      const googleConnected = credentials && credentials.length > 0;

      // Get onboarding progress (if table exists)
      let onboardingProgress = null;
      try {
        const { data: progress, error: progressError } = await supabase
          .from('onboarding_progress')
          .select('current_step, completed_steps, step_data, google_connected, completed')
          .eq('user_id', userId)
          .single();

        if (!progressError) {
          onboardingProgress = progress;
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.log('Onboarding progress table not found, using defaults');
      }

      // Get business config (if table exists)
      let businessConfig = null;
      try {
        const { data: config, error: configError } = await supabase
          .from('business_configs')
          .select('config, version, created_at, updated_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (!configError) {
          businessConfig = config;
        }
      } catch (e) {
        // Table might not exist, that's okay
        console.log('Business configs table not found, using defaults');
      }

      // Determine next step based on progress - ensure industry and service connection are mandatory
      let nextStep = 'welcome';
      const completedSteps = onboardingProgress ? onboardingProgress.completed_steps : [];

      if (!googleConnected) {
        nextStep = 'google-connection';
      } else if (!businessConfig || !completedSteps.includes('business-type')) {
        nextStep = 'business-type';
      } else if (!completedSteps.includes('business-categories')) {
        nextStep = 'business-categories';
      } else if (!completedSteps.includes('label-mapping')) {
        nextStep = 'label-mapping';
      } else if (!completedSteps.includes('team-setup')) {
        nextStep = 'team-setup';
      } else if (!onboardingProgress || !onboardingProgress.completed) {
        nextStep = 'workflow-deployment';
      } else {
        nextStep = 'completed';
      }

      // Only mark onboarding as completed if ALL requirements are met
      const isOnboardingCompleted = googleConnected &&
                                   businessConfig &&
                                   completedSteps.includes('business-type') &&
                                   completedSteps.includes('business-categories') &&
                                   onboardingProgress &&
                                   onboardingProgress.completed;

      res.status(200).json({
        success: true,
        user: {
          id: userId,
          email: user.email,
          firstName: user.first_name,
          companyName: user.company_name,
          emailVerified: user.email_verified || false,
          onboardingCompleted: isOnboardingCompleted
        },
        googleConnected,
        completedSteps: completedSteps || [],
        stepData: onboardingProgress ? onboardingProgress.step_data : {},
        nextStep,
        businessConfig: businessConfig ? businessConfig.config : null,
        onboardingCompleted: isOnboardingCompleted
      });

    } catch (error) {
      console.error('Onboarding status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load onboarding status',
        message: 'Something went wrong while loading onboarding information'
      });
    }
  });
}
