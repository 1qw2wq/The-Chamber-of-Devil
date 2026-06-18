const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.next', '.git'].includes(file)) continue;
      const full = path.join(dir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          search(full);
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.zip')) {
            console.log(full);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("=== Searching tmp ===");
search('/tmp');
console.log("=== Searching root ===");
search('/root');
console.log("=== Searching home ===");
search('/home');
