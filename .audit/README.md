# Source Code Audit System

This directory contains comprehensive tooling for auditing and cleaning up unused source code, dependencies, and database resources.

## 🎯 Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Run all source code audits
npm run audit:unused    # Find unused files/exports
npm run audit:deps      # Find unused dependencies
npm run audit:cycles    # Find circular dependencies
npm run audit:exports   # Find unused TypeScript exports
npm run audit:imports   # Check import issues

# Save audit results
npm run audit:unused > .audit/knip-summary.txt
npm run audit:deps   > .audit/depcheck.txt
npm run audit:cycles > .audit/madge.txt
```

## 🗄️ Database Audit (Supabase)

### Phase 1: Database Inventory

This directory contains the comprehensive audit system for cleaning up unused database objects in Supabase. The system follows a safe, reversible approach with proper guardrails.

## 🛡️ Guardrails

**CRITICAL**: Always run backup before any destructive operations:
```bash
npm run audit:backup
```

## 📊 Audit Process

### Phase 1: Inventory Everything
```bash
npm run audit:supabase    # Full database inventory
npm run audit:code        # Static code analysis
```

### Phase 2: Dynamic Usage Tracking
```bash
# Enable usage tracking (1 week minimum)
USAGE_AUDIT=true npm start

# After 1 week, export usage data
npm run audit:usage
```

### Phase 3: Analysis & Decision
```bash
npm run audit:analyze     # Generate decision matrix
```

### Phase 4: Safe Quarantine
```bash
npm run audit:quarantine  # Move objects to _deprecated schema
```

### Phase 5: Final Cleanup (after cool-off period)
```bash
npm run audit:cleanup     # Remove quarantined objects
```

## 📁 File Structure

```
.audit/
├── README.md                    # This file
├── latest-audit.json           # Latest full audit report
├── static-refs.json            # Static code analysis
├── usage-stats.json            # Dynamic usage statistics
├── decision-matrix.csv         # Keep/Quarantine/Remove decisions
├── full-audit-TIMESTAMP.json   # Historical audit reports
├── static-refs-TIMESTAMP.json  # Historical code analysis
└── usage-TIMESTAMP.json        # Historical usage data
```

## 📋 Report Contents

### Database Inventory (`latest-audit.json`)
- **Tables**: Row counts, sizes, vacuum statistics
- **Columns**: Data types, nullable constraints
- **RLS Policies**: Security policies and permissions
- **Views**: View definitions and dependencies
- **Functions**: RPC endpoints and definitions
- **Triggers**: Event handlers and timing
- **Dependencies**: Object relationships
- **Storage**: Buckets and object counts

### Static Analysis (`static-refs.json`)
- **Tables**: Referenced in code via `.from()`
- **RPCs**: Referenced in code via `.rpc()`
- **Storage**: Referenced via `.storage.from()`
- **Hits**: Exact file locations and context

### Dynamic Usage (`usage-stats.json`)
- **Real Usage**: Actual calls in production/staging
- **Frequency**: Call counts and patterns
- **Users**: Unique user interactions
- **Timing**: First/last usage timestamps

## 🎯 Decision Matrix

Each database object gets categorized:

| Decision | Criteria | Action |
|----------|----------|--------|
| **KEEP** | Active usage + code references | No action |
| **KEEP-LATER** | No usage but has data/dependencies | Archive/investigate |
| **QUARANTINE** | No usage + no references | Move to `_deprecated` schema |
| **REMOVE** | Quarantined + cool-off period passed | DROP object |

## 🔧 Usage Tracking

The instrumented Supabase client logs all database interactions:

```javascript
// Replace regular Supabase client
const { createClient } = require('./backend/lib/supabase-instrumented');

// Usage is automatically logged to _ops.usage_audit table
const supabase = createClient(url, key);
```

### Environment Variables
- `USAGE_AUDIT=true/false` - Enable/disable tracking
- `DATABASE_URL` - For audit logging connection

## 🗄️ Quarantine Schema

Objects are moved to `_deprecated` schema for safe removal:

```sql
-- Tables moved but data preserved
_deprecated.old_table

-- Columns renamed with prefix
users._deprecated_old_column

-- Functions renamed and access revoked
_deprecated_old_function()
```

## ⚠️ Safety Features

1. **Backup Guardrail**: Automatic backup before any changes
2. **Reversible Operations**: All changes can be rolled back
3. **Cool-off Period**: 14-30 days before final removal
4. **Error Monitoring**: Track 4xx/5xx spikes during quarantine
5. **Migration Versioning**: All changes in versioned migrations

## 📈 Monitoring

During quarantine period, monitor for:
- Application errors (4xx/5xx responses)
- Missing table/function errors
- Performance impacts
- User complaints

## 🔄 Rollback Procedures

### Restore from Backup
```bash
psql "$DATABASE_URL" < backups/YYYY-MM-DD-HH-MM-SS.sql
```

### Restore Quarantined Table
```sql
ALTER TABLE _deprecated.table_name SET SCHEMA public;
```

### Restore Quarantined Column
```sql
ALTER TABLE users RENAME COLUMN _deprecated_old_col TO old_col;
```

### Restore Quarantined Function
```sql
ALTER FUNCTION _deprecated_old_fn() RENAME TO old_fn;
GRANT EXECUTE ON FUNCTION old_fn() TO PUBLIC;
```

## 📊 Example Commands

```bash
# Full audit cycle
npm run audit:backup        # Create safety backup
npm run audit:supabase      # Inventory database
npm run audit:code          # Scan code references
# ... wait 1 week with USAGE_AUDIT=true ...
npm run audit:usage         # Export usage statistics
npm run audit:analyze       # Generate decisions
npm run audit:quarantine    # Safe quarantine
# ... wait 2-4 weeks ...
npm run audit:cleanup       # Final removal

# Quick status check
npm run audit:status        # Show current audit state
npm run audit:summary       # Summary of all reports
```

## 🚨 Emergency Procedures

If something breaks after quarantine:

1. **Immediate**: Restore from backup
2. **Targeted**: Restore specific objects from `_deprecated`
3. **Investigate**: Check usage logs and error monitoring
4. **Document**: Update decision matrix with findings

## 📝 Best Practices

1. **Never skip backup** - Always run `audit:backup` first
2. **Monitor actively** - Watch for errors during cool-off
3. **Document decisions** - Keep clear reasoning for each choice
4. **Test in staging** - Run full process in non-prod first
5. **Communicate changes** - Notify team of quarantine periods
6. **Version migrations** - All changes in proper migration files

## 🔍 Troubleshooting

### Common Issues

**Backup fails**: Check `pg_dump` installation and `DATABASE_URL`
**Usage tracking not working**: Verify `USAGE_AUDIT=true` and database connection
**Static analysis misses references**: Check file patterns in `find-supabase-refs.mjs`
**Quarantine breaks app**: Restore from `_deprecated` schema immediately

### Support

Check the audit logs and reports in this directory for detailed information about any issues.

---

## 💻 Source Code Audit System

### Phase 0: Guardrails ✅

**Branch**: `chore/code-audit`
**Quarantine**: `__deprecated__/` directory
**ESLint Protection**: Blocks imports from `__deprecated__/*`

### Phase 1: Static Analysis

```bash
# Run static analysis
npm run audit:unused      # Find unused files/exports (knip)
npm run audit:deps        # Find unused dependencies (depcheck)
npm run audit:cycles      # Find circular dependencies (madge)
npm run audit:code-full   # Run all static analysis
```

### Phase 2: Dynamic Analysis

```bash
# Enable runtime tracking
CODE_AUDIT=1 npm start    # Track module loads & route hits
```

### Available Source Code Commands

```bash
npm run audit:unused        # Unused files/exports
npm run audit:deps          # Unused dependencies
npm run audit:cycles        # Circular dependencies
npm run audit:code-full     # All static analysis
```

### Runtime Tracking

```bash
CODE_AUDIT=1 npm start      # Enable tracking
CODE_AUDIT=1 npm test       # Track test usage
```

## 🔧 Source Code Audit Tools

### Available Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run audit:unused` | Find unused files/exports | Console + `.audit/knip-summary.txt` |
| `npm run audit:deps` | Find unused dependencies | Console + `.audit/depcheck.txt` |
| `npm run audit:cycles` | Find circular dependencies | Console + `.audit/madge.txt` |
| `npm run audit:exports` | Find unused TypeScript exports | Console output |
| `npm run audit:imports` | Check import issues with ESLint | Console output |

### Configuration Files

- **knip.backend.json** - Backend-specific unused code detection
- **knip.frontend.json** - Frontend-specific unused code detection
- **.eslintrc.js** - Includes `no-restricted-imports` rule blocking `__deprecated__/*`

### Quarantine Process

1. **Identify unused code** using audit tools
2. **Move to quarantine**: `git mv file.js __deprecated__/YYYY-MM-DD/file.js`
3. **Leave throwing stubs** for shared exports:
   ```javascript
   module.exports = function deprecatedFunction() {
     throw new Error('DEPRECATED: use ../new-path (removed on YYYY-MM-DD)');
   };
   ```
4. **Cool-off period**: 14-30 days monitoring
5. **Permanent removal**: `git rm -r __deprecated__/YYYY-MM-DD`

### Safety Features

- **ESLint Protection**: Blocks imports from `__deprecated__/*`
- **Git History**: All moves preserved in version control
- **Throwing Stubs**: Immediate feedback if deprecated code is called
- **Reversible**: Easy to restore files during cool-off period
