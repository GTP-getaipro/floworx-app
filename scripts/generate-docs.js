const fs = require('fs');
const path = require('path');
const jsdoc = require('jsdoc-to-markdown');

/**
 * Generate API documentation from JSDoc comments
 */
async function generateDocs() {
  // Directories to scan
  const directories = [
    'backend',
    'frontend/src',
    'shared'
  ];

  // Output directory
  const docsDir = path.join(__dirname, '../docs/api');
  
  // Ensure docs directory exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Process each directory
  for (const dir of directories) {
    const files = getAllFiles(path.join(__dirname, '..', dir));
    const jsFiles = files.filter(file => /\.(js|ts|jsx|tsx)$/.test(file));

    // Group files by module
    const modules = groupFilesByModule(jsFiles);

    // Generate docs for each module
    for (const [module, moduleFiles] of Object.entries(modules)) {
      const docs = await jsdoc.render({
        files: moduleFiles,
        'heading-depth': 2,
        'example-lang': 'javascript',
        'name-format': 'code'
      });

      if (docs.trim()) {
        const outputFile = path.join(docsDir, `${module}.md`);
        fs.writeFileSync(outputFile, formatDocs(module, docs));
        console.log(`Generated docs for ${module}`);
      }
    }
  }

  // Generate index
  generateDocsIndex(docsDir);
  console.log('Documentation generation complete!');
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!isExcludedDir(entry.name)) {
        getAllFiles(fullPath, files);
      }
    } else if (!isExcludedFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check if directory should be excluded
 */
function isExcludedDir(name) {
  const excludedDirs = [
    'node_modules',
    'coverage',
    'dist',
    'build',
    '.git'
  ];
  return excludedDirs.includes(name);
}

/**
 * Check if file should be excluded
 */
function isExcludedFile(name) {
  const excludedFiles = [
    '.test.',
    '.spec.',
    '.d.ts'
  ];
  return excludedFiles.some(excluded => name.includes(excluded));
}

/**
 * Group files by module based on directory structure
 */
function groupFilesByModule(files) {
  const modules = {};

  for (const file of files) {
    const parts = path.dirname(file).split(path.sep);
    const moduleIndex = Math.max(
      parts.indexOf('backend'),
      parts.indexOf('frontend'),
      parts.indexOf('shared')
    );

    if (moduleIndex !== -1) {
      const module = parts.slice(moduleIndex + 1).join('-') || parts[moduleIndex];
      modules[module] = modules[module] || [];
      modules[module].push(file);
    }
  }

  return modules;
}

/**
 * Format documentation with header and footer
 */
function formatDocs(module, docs) {
  return `# ${module} Documentation

${docs}

---
*This documentation was automatically generated.*
`;
}

/**
 * Generate documentation index
 */
function generateDocsIndex(docsDir) {
  const files = fs.readdirSync(docsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const index = `# API Documentation

## Modules

${files.map(file => {
    const name = path.basename(file, '.md');
    return `* [${name}](${file})`;
  }).join('\n')}

---
*This documentation was automatically generated.*
`;

  fs.writeFileSync(path.join(docsDir, 'index.md'), index);
}

// Run documentation generator
generateDocs().catch(console.error);
