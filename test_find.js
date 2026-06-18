const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (['node_modules', '.next', '.git', 'proc', 'sys', 'dev', 'usr', 'lib', 'lib64', 'var', 'tmp', 'opt', 'etc', 'bld', 'bin', 'sbin', 'run'].includes(file)) {
        continue;
      }
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          search(full);
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.json') || file.endsWith('.css')) {
            console.log(full);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("=== Searching for project files ===");
search('/');
