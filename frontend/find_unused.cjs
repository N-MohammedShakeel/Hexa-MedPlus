const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) results.push(file);
    }
  });
  return results;
};
const components = walk('./src/components');
const unused = [];
components.forEach(comp => {
  const name = path.basename(comp, path.extname(comp));
  if (name === 'index') return;
  try {
    const out = execSync('git grep -l ' + name + ' src').toString().trim().split('\n');
    const compPosix = comp.replace(/\\\\/g, '/');
    const usage = out.filter(f => !f.includes(compPosix) && f.trim() !== '');
    if (usage.length === 0) unused.push(comp);
  } catch(e) {
    unused.push(comp);
  }
});
console.log(unused.join('\n'));
