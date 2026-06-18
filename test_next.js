const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          search(full);
        } else {
          if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.html')) {
            if (full.includes('page') || full.includes('route') || full.includes('layout') || stat.size > 5000) {
              console.log(full, stat.size);
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("=== Searching .next for source snippets ===");
search('.next');
