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
          console.log("DIR:", full);
          search(full);
        } else {
          console.log("FILE:", full, stat.size);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

search('.next');
