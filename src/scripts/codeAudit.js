// Code Audit Script
// Analyzes codebase for references to legacy field names

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Legacy field names to search for
const LEGACY_FIELDS = [
  'userID',
  'userId',
  'userName',
  // Add other legacy fields as needed
];

// Field name standardization mapping
const FIELD_MAPPING = {
  'userID': 'username',
  'userId': 'firebaseUid',
  'userName': 'name',
  // Add other mappings as needed
};

// File types to analyze
const FILE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
];

// Directories to skip
const SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  '.next',
  'out',
  'build',
  'dist',
  'coverage',
  'backups',
  'audits',
];

/**
 * Recursively scans a directory for files with specified extensions
 * @param {string} dir - Directory path to scan
 * @param {string[]} extensions - File extensions to include
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, extensions) {
  let results = [];
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      if (!SKIP_DIRECTORIES.includes(item)) {
        results = results.concat(findFiles(itemPath, extensions));
      }
    } else if (stats.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(itemPath);
      }
    }
  }
  
  return results;
}

/**
 * Analyzes a file for references to legacy field names
 * @param {string} filePath - Path to the file
 * @param {string[]} fieldNames - Legacy field names to search for
 * @returns {Object} Analysis results
 */
function analyzeFile(filePath, fieldNames) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const results = {
    filePath,
    relativePath: path.relative(process.cwd(), filePath),
    references: []
  };
  
  // Check each line for legacy field names
  lines.forEach((line, lineNumber) => {
    fieldNames.forEach(field => {
      // Skip commented lines
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        return;
      }
      
      // Look for the field name as a separate identifier
      // This regex looks for the field name as a whole word
      const regex = new RegExp(`\\b${field}\\b`, 'g');
      
      let match;
      while ((match = regex.exec(line)) !== null) {
        results.references.push({
          field,
          lineNumber: lineNumber + 1,
          line: line.trim(),
          position: match.index,
          suggestedReplacement: FIELD_MAPPING[field]
        });
      }
    });
  });
  
  return results;
}

/**
 * Main audit function
 * @param {string} sourceDir - Directory to audit
 * @returns {Object} Audit results
 */
async function auditCode(sourceDir = process.cwd()) {
  try {
    console.log('Starting code audit...');
    console.log(`Scanning directory: ${sourceDir}`);
    
    // Find all relevant files
    const files = findFiles(sourceDir, FILE_EXTENSIONS);
    console.log(`Found ${files.length} files to analyze`);
    
    // Analyze each file
    const results = {
      summary: {
        totalFiles: files.length,
        filesWithLegacyFields: 0,
        totalReferences: 0,
        legacyFieldCounts: {}
      },
      fileReferences: []
    };
    
    // Initialize counts for each legacy field
    LEGACY_FIELDS.forEach(field => {
      results.summary.legacyFieldCounts[field] = 0;
    });
    
    // Process each file
    for (const file of files) {
      const fileResults = analyzeFile(file, LEGACY_FIELDS);
      
      if (fileResults.references.length > 0) {
        results.summary.filesWithLegacyFields++;
        results.summary.totalReferences += fileResults.references.length;
        
        // Count occurrences of each legacy field
        fileResults.references.forEach(ref => {
          results.summary.legacyFieldCounts[ref.field]++;
        });
        
        results.fileReferences.push(fileResults);
      }
      
      // Log progress occasionally
      if (files.indexOf(file) % 100 === 0) {
        console.log(`Analyzed ${files.indexOf(file) + 1}/${files.length} files...`);
      }
    }
    
    // Sort file references by number of references (most first)
    results.fileReferences.sort((a, b) => b.references.length - a.references.length);
    
    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputDir = path.resolve(process.cwd(), 'audits');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `code-audit-${timestamp}.json`);
    
    // Write results to file
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Audit completed. Results saved to ${outputFile}`);
    
    // Also generate a human-readable summary
    const summaryFile = path.join(outputDir, `code-audit-summary-${timestamp}.md`);
    
    let markdownSummary = `# Code Audit Summary\n\n`;
    markdownSummary += `Audit date: ${new Date().toISOString()}\n\n`;
    markdownSummary += `## Overview\n\n`;
    markdownSummary += `- Total files analyzed: ${results.summary.totalFiles}\n`;
    markdownSummary += `- Files with legacy field references: ${results.summary.filesWithLegacyFields}\n`;
    markdownSummary += `- Total legacy field references: ${results.summary.totalReferences}\n\n`;
    
    markdownSummary += `## Legacy Field Counts\n\n`;
    
    for (const [field, count] of Object.entries(results.summary.legacyFieldCounts)) {
      markdownSummary += `- \`${field}\` → \`${FIELD_MAPPING[field]}\`: ${count} references\n`;
    }
    
    markdownSummary += `\n## Files Requiring Updates\n\n`;
    
    // List files by reference count
    results.fileReferences.forEach(file => {
      markdownSummary += `### ${file.relativePath} (${file.references.length} references)\n\n`;
      
      // Group references by field type
      const fieldGroups = {};
      
      file.references.forEach(ref => {
        if (!fieldGroups[ref.field]) {
          fieldGroups[ref.field] = [];
        }
        fieldGroups[ref.field].push(ref);
      });
      
      for (const [field, refs] of Object.entries(fieldGroups)) {
        markdownSummary += `#### \`${field}\` → \`${FIELD_MAPPING[field]}\` (${refs.length} occurrences)\n\n`;
        
        // Show first 5 references as examples
        const exampleRefs = refs.slice(0, 5);
        
        exampleRefs.forEach(ref => {
          markdownSummary += `- Line ${ref.lineNumber}: \`${ref.line}\`\n`;
        });
        
        if (refs.length > 5) {
          markdownSummary += `- ... and ${refs.length - 5} more\n`;
        }
        
        markdownSummary += `\n`;
      }
    });
    
    fs.writeFileSync(summaryFile, markdownSummary);
    console.log(`Summary report saved to ${summaryFile}`);
    
    return results;
  } catch (error) {
    console.error('Audit failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Default to the src directory
    const sourceDir = path.resolve(process.cwd(), 'src');
    await auditCode(sourceDir);
    console.log('Code audit completed successfully');
  } catch (error) {
    console.error('Code audit failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { auditCode }; 