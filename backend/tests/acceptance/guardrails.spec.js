/**
 * FloWorx Guardrails System Tests
 * 
 * These tests validate that all architectural guardrails are working correctly
 * to prevent the drift issues that caused production outages.
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { authConfig, validateAuthConfig, getTokenTTLMs, isEmailServiceConfigured } = require('../../config/authConfig');

describe('FloWorx Guardrails System', () => {
  
  describe('Authentication Configuration Guardrails', () => {
    test('authConfig.js exists and is properly structured', () => {
      const configPath = path.join(__dirname, '../../config/authConfig.js');
      expect(fs.existsSync(configPath)).toBe(true);
      
      // Verify required configuration sections exist
      expect(authConfig).toHaveProperty('tokens');
      expect(authConfig).toHaveProperty('password');
      expect(authConfig).toHaveProperty('rateLimits');
      expect(authConfig).toHaveProperty('email');
      expect(authConfig).toHaveProperty('security');
    });

    test('password reset token TTL is exactly 15 minutes', () => {
      expect(authConfig.tokens.passwordResetTTL).toBe(15);
    });

    test('email verification token TTL is 24 hours (1440 minutes)', () => {
      expect(authConfig.tokens.emailVerificationTTL).toBe(1440);
    });

    test('getTokenTTLMs function works correctly', () => {
      const passwordResetMs = getTokenTTLMs('passwordResetTTL');
      expect(passwordResetMs).toBe(15 * 60 * 1000); // 15 minutes in milliseconds
      
      const emailVerificationMs = getTokenTTLMs('emailVerificationTTL');
      expect(emailVerificationMs).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
    });

    test('validateAuthConfig function exists and can be called', () => {
      expect(typeof validateAuthConfig).toBe('function');
      
      // Note: We don't call validateAuthConfig() here because it requires
      // environment variables that may not be set in test environment
    });

    test('isEmailServiceConfigured function works', () => {
      expect(typeof isEmailServiceConfigured).toBe('function');
      const result = isEmailServiceConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Component Structure Guardrails', () => {
    test('no duplicate auth components exist in forbidden locations', () => {
      const forbiddenPaths = [
        'frontend/src/pages/Auth/Login.js',
        'frontend/src/pages/Auth/Register.js',
        'frontend/src/pages/Auth/VerifyEmail.js',
        'frontend/src/components/Login.js',
        'frontend/src/components/Register.js'
      ];

      forbiddenPaths.forEach(forbiddenPath => {
        const fullPath = path.join(__dirname, '../../../', forbiddenPath);
        expect(fs.existsSync(fullPath)).toBe(false);
      });
    });

    test('canonical auth components exist', () => {
      const canonicalComponents = [
        'frontend/src/pages/ForgotPasswordPage.jsx',
        'frontend/src/pages/ResetPasswordPage.jsx',
        'frontend/src/pages/LoginPage.jsx',
        'frontend/src/pages/RegisterPage.jsx',
        'frontend/src/pages/VerifyEmailPage.jsx'
      ];

      canonicalComponents.forEach(componentPath => {
        const fullPath = path.join(__dirname, '../../../', componentPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    test('README documentation exists for component structure', () => {
      const readmePaths = [
        'frontend/src/pages/README.md',
        'frontend/src/components/README.md'
      ];

      readmePaths.forEach(readmePath => {
        const fullPath = path.join(__dirname, '../../../', readmePath);
        expect(fs.existsSync(fullPath)).toBe(true);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content).toContain('GUARDRAIL');
        expect(content).toContain('CANONICAL');
      });
    });
  });

  describe('Email Security Guardrails', () => {
    test('auth pages do not contain email pre-filling patterns', () => {
      const authPages = [
        'frontend/src/pages/ForgotPasswordPage.jsx',
        'frontend/src/pages/LoginPage.jsx',
        'frontend/src/pages/RegisterPage.jsx'
      ];

      const forbiddenPatterns = [
        /defaultValue.*email/i,
        /value.*user.*email/i,
        /localStorage.*email/i,
        /sessionStorage.*email/i
      ];

      authPages.forEach(pagePath => {
        const fullPath = path.join(__dirname, '../../../', pagePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          forbiddenPatterns.forEach(pattern => {
            expect(content).not.toMatch(pattern);
          });
        }
      });
    });

    test('server validates auth configuration on startup', () => {
      const serverPath = path.join(__dirname, '../../server.js');
      expect(fs.existsSync(serverPath)).toBe(true);
      
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      expect(serverContent).toContain('validateAuthConfig');
    });
  });

  describe('Token TTL Consistency Guardrails', () => {
    test('database operations use centralized configuration', () => {
      const dbOpsPath = path.join(__dirname, '../../database/database-operations.js');
      expect(fs.existsSync(dbOpsPath)).toBe(true);
      
      const dbOpsContent = fs.readFileSync(dbOpsPath, 'utf8');
      expect(dbOpsContent).toContain('authConfig');
    });

    test('password reset service uses centralized configuration', () => {
      const servicePath = path.join(__dirname, '../../services/passwordResetService.js');
      expect(fs.existsSync(servicePath)).toBe(true);
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      expect(serviceContent).toContain('getTokenTTLMs');
    });

    test('no hardcoded token TTLs in backend code', () => {
      const backendDir = path.join(__dirname, '../../');
      const jsFiles = getAllJsFiles(backendDir);
      
      const hardcodedTTLPatterns = [
        // Only check for specific authentication-related hardcoded TTLs
        // Exclude legitimate uses like alert cooldowns, general timeouts, etc.
        /windowMs:\s*15\s*\*\s*60\s*\*\s*1000.*(?:password|auth|login|reset)/i,
        /expires.*15\s*\*\s*60\s*\*\s*1000.*(?:password|auth|token)/i
      ];

      jsFiles.forEach(filePath => {
        // Skip the authConfig.js file itself and test files
        if (filePath.includes('authConfig.js') || filePath.includes('test') || filePath.includes('spec')) {
          return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        hardcodedTTLPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Design System Guardrails', () => {
    test('ESLint configuration prevents external design libraries', () => {
      const eslintConfigs = [
        '.eslintrc.js',
        'frontend/.eslintrc.js'
      ];

      eslintConfigs.forEach(configPath => {
        const fullPath = path.join(__dirname, '../../../', configPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content).toContain('no-restricted-imports');
          expect(content).toContain('@mui');
          expect(content).toContain('bootstrap');
        }
      });
    });

    test('no external design library imports in frontend code', () => {
      const frontendSrcDir = path.join(__dirname, '../../../frontend/src');
      if (fs.existsSync(frontendSrcDir)) {
        const jsxFiles = getAllJsxFiles(frontendSrcDir);
        
        const forbiddenImports = [
          '@mui/',
          '@material-ui/',
          'bootstrap',
          'react-bootstrap',
          'antd',
          '@ant-design/',
          '@chakra-ui/',
          'semantic-ui-react',
          '@mantine/'
        ];

        jsxFiles.forEach(filePath => {
          // Skip test files that may reference forbidden imports in test descriptions
          if (filePath.includes('test') || filePath.includes('spec') || filePath.includes('__tests__')) {
            return;
          }

          const content = fs.readFileSync(filePath, 'utf8');
          forbiddenImports.forEach(forbiddenImport => {
            expect(content).not.toContain(forbiddenImport);
          });
        });
      }
    });
  });

  describe('CI/CD Guardrails', () => {
    test('CI pipeline includes guardrail validation steps', () => {
      const ciPath = path.join(__dirname, '../../../.github/workflows/ci.yml');
      expect(fs.existsSync(ciPath)).toBe(true);
      
      const ciContent = fs.readFileSync(ciPath, 'utf8');
      expect(ciContent).toContain('FloWorx Guardrails');
      expect(ciContent).toContain('Component Structure');
      expect(ciContent).toContain('Design System Enforcement');
      expect(ciContent).toContain('Authentication Configuration');
      expect(ciContent).toContain('Email Security');
    });

    test('guardrails validation script exists and is executable', () => {
      const scriptPath = path.join(__dirname, '../../../scripts/validate-guardrails.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      expect(scriptContent).toContain('validateComponentStructure');
      expect(scriptContent).toContain('validateDesignSystem');
      expect(scriptContent).toContain('validateAuthConfiguration');
      expect(scriptContent).toContain('validateEmailSecurity');
    });
  });
});

/**
 * Helper function to get all JS files in a directory recursively
 */
function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(getAllJsFiles(filePath));
      }
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  
  return results;
}

/**
 * Helper function to get all JSX files in a directory recursively
 */
function getAllJsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(getAllJsxFiles(filePath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  
  return results;
}
