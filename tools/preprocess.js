const fs = require('fs');
function main() {
  let txt = fs.readFileSync(process.stdin.fd, 'utf-8');
  const r = /\/\*codegen:start([\s\S]+?)codegen:end\*\//;
  let m = txt.match(r);
  while (m) {
    const macro = m[1];
    const code = eval(macro);
    txt = txt.replace(r, code);
    m = txt.match(r);
  }
  console.log(txt);
}
main();
