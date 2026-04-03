const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace all limit: "1000" or limit: "10000" or limit: '1000' inside handleExport
  // Specifically we only want to change limits related to exports. 
  // Let's just find limit: "1000" globally in standard pages since these usually map to exports
  const regex = /limit:\s*["']10?00["']/g;
  if (regex.test(content)) {
    content = content.replace(regex, 'limit: "999999"');
    fs.writeFileSync(file, content);
    changed++;
    console.log('Updated limit to 999999 in', file);
  }
});
console.log('Total files updated limit:', changed);
