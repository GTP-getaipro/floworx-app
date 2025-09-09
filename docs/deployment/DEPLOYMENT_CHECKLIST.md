# Floworx Business Type Selection - Production Deployment Checklist

## 🗃️ Database Migration

### Pre-Migration Checklist
- [ ] **Backup database** before running migration
- [ ] **Verify password reset system** is fully deployed and working
- [ ] **Test migration in development** environment first
- [ ] **Check current database schema** for any conflicts

### Migration Execution
1. **Open Supabase SQL Editor**
2. **Copy entire contents** of `database-migration-business-types.sql`
3. **Paste and execute** the migration script
4. **Verify results** - should see:
   - ✅ `business_types` table created (9 columns)
   - ✅ `workflow_templates` table created (11 columns)
   - ✅ `business_type_id` column added to users table
   - ✅ RLS policies enabled on new tables
   - ✅ "Hot Tub & Spa" business type inserted
   - ✅ Default workflow template created

### Post-Migration Verification
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('business_types', 'workflow_templates');

-- Verify seed data
SELECT id, name, slug FROM business_types WHERE is_active = true;

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('business_types', 'workflow_templates');
```

## 🔧 Backend Deployment

### Files to Deploy
- [ ] **NEW**: `backend/routes/businessTypes.js`
- [ ] **UPDATED**: `backend/server.js` (added business types routes)
- [ ] **UPDATED**: `backend/routes/onboarding-v2.js` (business type step logic)
- [ ] **UPDATED**: `backend/routes/workflows.js` (business type-aware deployment)
- [ ] **UPDATED**: `backend/services/onboardingSessionService.js` (step order)

### Deployment Steps
1. **Deploy backend code** to your hosting platform (Railway/Vercel/etc.)
2. **Restart backend services** to load new routes
3. **Verify environment variables** are still configured correctly
4. **Test API endpoints** are responding

### Backend Verification Tests
```bash
# Test business types endpoint (should return Hot Tub & Spa)
curl -X GET https://your-api-domain.com/api/business-types

# Test onboarding status (should include business type logic)
curl -X GET https://your-api-domain.com/api/onboarding/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎨 Frontend Deployment

### Files to Deploy
- [ ] **NEW**: `frontend/src/components/onboarding/BusinessTypeStep.js`
- [ ] **NEW**: `frontend/src/components/onboarding/BusinessTypeStep.css`
- [ ] **UPDATED**: `frontend/src/components/OnboardingWizard.js` (added business type step)

### Deployment Steps
1. **Build frontend** with updated components
   ```bash
   cd frontend
   npm run build
   ```
2. **Deploy to hosting platform** (Vercel/Netlify/etc.)
3. **Verify build completed** without errors
4. **Test frontend loads** correctly

### Frontend Verification
- [ ] **Onboarding wizard loads** without errors
- [ ] **Business type step appears** after Google OAuth
- [ ] **"Hot Tub & Spa" option** is visible and selectable
- [ ] **Step progression works** correctly
- [ ] **Mobile responsive** design functions properly

## 🧪 End-to-End Testing

### Complete User Journey Test
1. **New User Registration**
   - [ ] Register new test account
   - [ ] Verify email and login
   - [ ] Onboarding wizard starts

2. **Google OAuth Connection**
   - [ ] Connect Google account successfully
   - [ ] Proceeds to business type selection

3. **Business Type Selection**
   - [ ] "Hot Tub & Spa" option displays
   - [ ] Selection saves successfully
   - [ ] Proceeds to business categories

4. **Complete Onboarding**
   - [ ] Business categories step loads
   - [ ] Label mapping works
   - [ ] Team setup functions
   - [ ] Review step shows business type
   - [ ] Workflow deployment succeeds

5. **Workflow Verification**
   - [ ] n8n workflow created with hot tub template
   - [ ] Workflow includes industry-specific nodes
   - [ ] Email automation functions correctly

### Database Verification Queries
```sql
-- Check user business type selection
SELECT u.email, u.business_type_id, bt.name as business_type
FROM users u
LEFT JOIN business_types bt ON u.business_type_id = bt.id
WHERE u.email = 'test@example.com';

-- Check onboarding progress includes business type step
SELECT user_id, completed_steps, step_data->'business-type' as business_type_data
FROM onboarding_progress
WHERE user_id = 'TEST_USER_ID';

-- Check workflow deployment with business type context
SELECT wd.user_id, wd.workflow_name, wd.template_used, bt.name as business_type
FROM workflow_deployments wd
JOIN users u ON wd.user_id = u.id
JOIN business_types bt ON u.business_type_id = bt.id
WHERE wd.user_id = 'TEST_USER_ID';
```

## 📊 Post-Deployment Monitoring

### Analytics to Monitor
- [ ] **Business type selection rate**: Should be 100% for new users
- [ ] **Onboarding completion rate**: Should maintain current levels
- [ ] **Workflow deployment success**: Should use correct templates
- [ ] **Step progression time**: Business type step should be < 30 seconds

### Error Monitoring
- [ ] **API endpoint errors**: Monitor `/api/business-types/*` endpoints
- [ ] **Database query errors**: Watch for RLS policy violations
- [ ] **Frontend console errors**: Check for component rendering issues
- [ ] **Workflow deployment failures**: Monitor n8n template loading

### Success Metrics
```sql
-- Business type selection analytics
SELECT 
    bt.name,
    COUNT(*) as selections,
    AVG(EXTRACT(EPOCH FROM (created_at - trial_started_at))/60) as avg_selection_time_minutes
FROM users u
JOIN business_types bt ON u.business_type_id = bt.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY bt.name;

-- Onboarding completion with business type
SELECT 
    bt.name as business_type,
    COUNT(*) as completed_onboardings,
    AVG(op.updated_at - u.created_at) as avg_completion_time
FROM users u
JOIN business_types bt ON u.business_type_id = bt.id
JOIN onboarding_progress op ON u.id = op.user_id
WHERE op.onboarding_completed = true
AND u.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY bt.name;
```

## 🚨 Rollback Procedures

### If Issues Occur
1. **Frontend Issues**: Revert to previous frontend deployment
2. **Backend Issues**: Revert backend code, restart services
3. **Database Issues**: 
   ```sql
   -- Remove business_type_id column if needed
   ALTER TABLE users DROP COLUMN IF EXISTS business_type_id;
   
   -- Drop new tables if needed
   DROP TABLE IF EXISTS workflow_templates;
   DROP TABLE IF EXISTS business_types;
   ```

### Emergency Contacts
- [ ] **Database Admin**: For critical database issues
- [ ] **DevOps Team**: For deployment rollbacks
- [ ] **Product Team**: For user experience issues

## ✅ Deployment Sign-off

### Pre-Production Checklist
- [ ] All code reviewed and tested
- [ ] Database migration tested in staging
- [ ] Backup procedures verified
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Production Deployment
- [ ] Database migration executed successfully
- [ ] Backend deployed and verified
- [ ] Frontend deployed and verified
- [ ] End-to-end testing completed
- [ ] Monitoring confirms system health

### Post-Deployment
- [ ] User journey tested in production
- [ ] Analytics showing successful business type selections
- [ ] No errors in application logs
- [ ] Performance metrics within acceptable ranges
- [ ] Team notified of successful deployment

**Deployment Date**: ___________
**Deployed By**: ___________
**Verified By**: ___________

---

## 🎯 Success Criteria

✅ **100% of new users** complete business type selection
✅ **Zero deployment failures** due to missing business type
✅ **Onboarding completion rate** maintains current levels
✅ **System ready** for multi-industry expansion
✅ **All existing functionality** remains intact
