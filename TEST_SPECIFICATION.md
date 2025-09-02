# Floworx Test Specification - Business Type Selection & Password Reset

## 🎯 Test Scope

This document outlines comprehensive test coverage for:
- Business Type Selection System
- Password Reset Functionality
- Integration with existing Floworx systems
- Multi-tenant security and RLS policies

## 📊 Test Coverage Requirements

- **Minimum Code Coverage**: 80% for new functionality
- **API Response Time**: < 500ms for all endpoints
- **Database Query Performance**: < 100ms for standard operations
- **UI Component Rendering**: < 200ms initial load

## 🧪 Test Categories

### 1. Database Integration Tests

#### Business Types Table
- **BT-DB-001**: Create business type with valid data
- **BT-DB-002**: Prevent duplicate business type names/slugs
- **BT-DB-003**: Soft delete business type (set is_active = false)
- **BT-DB-004**: Query active business types only
- **BT-DB-005**: Validate JSONB default_categories structure

#### Workflow Templates Table
- **WT-DB-001**: Create workflow template linked to business type
- **WT-DB-002**: Prevent orphaned templates (foreign key constraint)
- **WT-DB-003**: Query templates by business type
- **WT-DB-004**: Validate template_json structure
- **WT-DB-005**: Version management for templates

#### Users Table Integration
- **U-DB-001**: Add business_type_id to existing user
- **U-DB-002**: Query users with business type join
- **U-DB-003**: Handle NULL business_type_id gracefully
- **U-DB-004**: Update user business type selection

#### RLS Policy Tests
- **RLS-001**: Users can only view active business types
- **RLS-002**: Users cannot access other users' password reset tokens
- **RLS-003**: Service role can manage all security data
- **RLS-004**: Anonymous users can view public business types

### 2. API Integration Tests

#### Business Types Endpoints
- **BT-API-001**: GET /api/business-types returns active types
- **BT-API-002**: GET /api/business-types/:slug returns specific type
- **BT-API-003**: POST /api/business-types/select requires authentication
- **BT-API-004**: POST /api/business-types/select validates business type ID
- **BT-API-005**: GET /api/business-types/user/current returns user selection

#### Password Reset Endpoints
- **PR-API-001**: POST /api/password-reset/request rate limiting (3/15min)
- **PR-API-002**: POST /api/password-reset/request email validation
- **PR-API-003**: POST /api/password-reset/validate token format validation
- **PR-API-004**: POST /api/password-reset/reset password strength validation
- **PR-API-005**: POST /api/password-reset/reset rate limiting (5/15min)

#### Authentication & Authorization
- **AUTH-001**: JWT token validation on protected endpoints
- **AUTH-002**: Expired token rejection
- **AUTH-003**: Invalid token format handling
- **AUTH-004**: Missing authorization header handling

#### Error Handling
- **ERR-001**: 400 Bad Request for invalid input
- **ERR-002**: 401 Unauthorized for missing/invalid auth
- **ERR-003**: 404 Not Found for non-existent resources
- **ERR-004**: 429 Too Many Requests for rate limiting
- **ERR-005**: 500 Internal Server Error handling

### 3. Onboarding Flow Integration Tests

#### Step Progression
- **OF-001**: Welcome → Google OAuth → Business Type → Categories
- **OF-002**: Business type selection required before categories
- **OF-003**: Skip business type if already selected
- **OF-004**: Onboarding progress tracking includes business type
- **OF-005**: Session persistence across browser refresh

#### Data Persistence
- **DP-001**: Business type selection saves to database
- **DP-002**: Onboarding progress updates correctly
- **DP-003**: Analytics events tracked for business type selection
- **DP-004**: Step data includes business type context

#### Workflow Deployment Integration
- **WD-001**: Workflow template selected based on business type
- **WD-002**: Template customization with user-specific data
- **WD-003**: Deployment failure handling for missing business type
- **WD-004**: n8n API integration with business type context

### 4. Frontend Component Tests

#### BusinessTypeStep Component
- **BTS-001**: Renders loading state while fetching business types
- **BTS-002**: Displays business type cards with correct data
- **BTS-003**: Handles business type selection interaction
- **BTS-004**: Shows validation error for no selection
- **BTS-005**: Displays success state after selection
- **BTS-006**: Handles API error states gracefully
- **BTS-007**: Responsive design on mobile devices
- **BTS-008**: Keyboard navigation support
- **BTS-009**: Screen reader accessibility

#### Password Reset Components
- **FP-001**: ForgotPassword form validation
- **FP-002**: Email input sanitization
- **FP-003**: Loading state during submission
- **FP-004**: Success message display
- **FP-005**: Error handling for API failures

- **RP-001**: ResetPassword token validation on mount
- **RP-002**: Password strength indicator
- **RP-003**: Password confirmation matching
- **RP-004**: Form submission with valid data
- **RP-005**: Redirect to login after successful reset

### 5. Security Tests

#### Multi-tenant Isolation
- **MT-001**: User A cannot access User B's business type data
- **MT-002**: Password reset tokens isolated by user
- **MT-003**: Security audit logs respect user boundaries
- **MT-004**: Credential backups isolated by user

#### Input Validation & Sanitization
- **IV-001**: SQL injection prevention in business type queries
- **IV-002**: XSS prevention in business type descriptions
- **IV-003**: Password reset token format validation
- **IV-004**: Email address validation and sanitization

#### Rate Limiting & Abuse Prevention
- **RL-001**: Password reset request rate limiting
- **RL-002**: Business type selection rate limiting
- **RL-003**: Failed login attempt tracking
- **RL-004**: Account lockout after failed attempts

### 6. Performance Tests

#### Database Performance
- **DB-PERF-001**: Business type query < 50ms
- **DB-PERF-002**: User business type join < 100ms
- **DB-PERF-003**: Workflow template query < 75ms
- **DB-PERF-004**: RLS policy overhead < 25ms

#### API Performance
- **API-PERF-001**: GET /api/business-types < 200ms
- **API-PERF-002**: POST /api/business-types/select < 300ms
- **API-PERF-003**: Password reset endpoints < 500ms
- **API-PERF-004**: Concurrent request handling (100 req/s)

#### Frontend Performance
- **FE-PERF-001**: BusinessTypeStep initial render < 200ms
- **FE-PERF-002**: Business type selection response < 100ms
- **FE-PERF-003**: Component re-render optimization
- **FE-PERF-004**: Bundle size impact < 50KB

### 7. Backward Compatibility Tests

#### Existing User Support
- **BC-001**: Users without business type can complete onboarding
- **BC-002**: Existing workflows continue to function
- **BC-003**: Legacy API endpoints remain functional
- **BC-004**: Database migration preserves existing data

#### Feature Flag Support
- **FF-001**: Business type step can be disabled via feature flag
- **FF-002**: Graceful degradation when business types unavailable
- **FF-003**: A/B testing support for business type UI variations

## 🎯 Acceptance Criteria

### Functional Requirements
- ✅ All business type CRUD operations work correctly
- ✅ Password reset flow completes successfully
- ✅ Onboarding includes business type selection
- ✅ Workflow deployment uses correct templates
- ✅ Multi-tenant security enforced

### Non-Functional Requirements
- ✅ 80% minimum code coverage
- ✅ All API responses < 500ms
- ✅ Database queries < 100ms
- ✅ UI components render < 200ms
- ✅ Zero security vulnerabilities

### Quality Gates
- ✅ All integration tests pass
- ✅ All functional tests pass
- ✅ Performance benchmarks met
- ✅ Security scan passes
- ✅ Accessibility compliance (WCAG 2.1 AA)

## 📈 Test Metrics & Reporting

### Coverage Metrics
- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Function Coverage**: Minimum 85%
- **Statement Coverage**: Minimum 80%

### Performance Metrics
- **API Response Time**: P95 < 500ms
- **Database Query Time**: P95 < 100ms
- **UI Render Time**: P95 < 200ms
- **Memory Usage**: < 100MB increase

### Quality Metrics
- **Bug Density**: < 1 bug per 100 lines of code
- **Test Execution Time**: < 10 minutes for full suite
- **Flaky Test Rate**: < 2%
- **Test Maintenance Effort**: < 20% of development time

## 🔄 Test Execution Strategy

### Continuous Integration
- **Unit Tests**: Run on every commit
- **Integration Tests**: Run on pull requests
- **E2E Tests**: Run on staging deployment
- **Performance Tests**: Run nightly
- **Security Tests**: Run weekly

### Test Environments
- **Local Development**: Unit and component tests
- **CI/CD Pipeline**: Integration and API tests
- **Staging Environment**: E2E and performance tests
- **Production**: Smoke tests and monitoring

### Test Data Management
- **Fixtures**: Standardized test data sets
- **Factories**: Dynamic test data generation
- **Cleanup**: Automated test data cleanup
- **Isolation**: Each test runs with fresh data

This specification ensures comprehensive coverage of all new functionality while maintaining system reliability and performance standards.
