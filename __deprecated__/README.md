# Quarantine Directory

This directory contains deprecated/unused code that has been quarantined before removal.

## Structure

```
__deprecated__/
├── YYYY-MM-DD/           # Date-based quarantine batches
│   ├── backend/          # Quarantined backend files
│   ├── frontend/         # Quarantined frontend files
│   └── shared/           # Quarantined shared files
└── README.md            # This file
```

## Quarantine Process

1. **Move files**: `git mv path/to/file.js __deprecated__/2025-09-17/path/to/file.js`
2. **Leave stubs** for shared exports:
   ```javascript
   module.exports = function deprecatedFunction() {
     throw new Error('DEPRECATED: use ../new-path (removed on 2025-10-01)');
   };
   ```
3. **Cool-off period**: 14-30 days
4. **Monitor**: Watch for errors during cool-off
5. **Remove**: `git rm -r __deprecated__/2025-09-17`

## Current Quarantine Items

| Original Path | Reason | Owner | Planned Deletion | Status |
|---------------|--------|-------|------------------|--------|
| (none yet)    | -      | -     | -                | -      |

## ESLint Protection

The ESLint configuration prevents accidental imports from this directory:

```javascript
'no-restricted-imports': ['error', { 
  patterns: ['**/__deprecated__/*'] 
}]
```

## Rollback Procedure

If something breaks during cool-off:

```bash
# Restore specific file
git mv __deprecated__/2025-09-17/path/to/file.js path/to/file.js

# Restore entire batch
git mv __deprecated__/2025-09-17/* ./
```
