const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.next', '.git', 'proc', 'sys', 'dev', 'usr', 'lib', 'lib64', 'var', 'tmp', 'opt', 'etc', 'bld', 'bin', 'sbin', 'run'].includes(file)) {
        continue;
      }
      const full = path.join(dir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          search(full);
        } else {
          // search for contents
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('The Chamber of Devil') || content.includes('adrenaline') || content.includes('ChamberOfDevil')) {
            console.log("MATCH FOUND:", full, stat.size);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("=== Searching for Chamber of Devil ===");
search('/');
