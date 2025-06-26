import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let fixedContent = content;
  
  // Fix all types of relative imports that don't have extensions
  const patterns = [
    // from "./path" or from './path'
    /from\s+["'](\.\/.+?)["']/g,
    // from "../path" or from '../path'  
    /from\s+["'](\.\.\/.+?)["']/g,
    // import("./path") dynamic imports
    /import\s*\(\s*["'](\.\/.+?)["']\s*\)/g,
    // import("../path") dynamic imports
    /import\s*\(\s*["'](\.\.\/.+?)["']\s*\)/g,
    // export from "./path"
    /export\s+.*\s+from\s+["'](\.\/.+?)["']/g,
    // export from "../path"
    /export\s+.*\s+from\s+["'](\.\.\/.+?)["']/g
  ];
  
  patterns.forEach(pattern => {
    fixedContent = fixedContent.replace(pattern, (match, importPath) => {
      // Only add .js if it doesn't already have an extension and it's not a directory import
      if (!path.extname(importPath) && !importPath.endsWith('/')) {
        const newImportPath = importPath + '.js';
        return match.replace(importPath, newImportPath);
      }
      return match;
    });
  });
  
  // Handle import statements at the beginning of lines
  fixedContent = fixedContent.replace(
    /^(\s*import\s+.+?\s+from\s+["'])(\.\/.+?|\.\.\/.+?)(["'])/gm,
    (match, before, importPath, after) => {
      if (!path.extname(importPath) && !importPath.endsWith('/')) {
        return before + importPath + '.js' + after;
      }
      return match;
    }
  );
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`✅ Fixed imports in: ${path.relative(__dirname, filePath)}`);
  }
}

function fixImportsInDirectory(dir, depth = 0) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      fixImportsInDirectory(fullPath, depth + 1);
    } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
      fixImportsInFile(fullPath);
    }
  }
}

// Fix imports in dist directory
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
  fixImportsInDirectory(distDir);
  console.log('✨ Import fixing complete!');
} else {
  console.log('❌ Dist directory not found. Run build first.');
}
