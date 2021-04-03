const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const changeCase = require("change-case");
const {config} = require("./config");
const {circuitInputEncoderTpl} = require("./templates");

// codegen is the module to inject inside the ejs template system
const codegen = {
  config,
  generateCircuitInputEncoderJs,
  generateCircuitInputDecoderCircom
}
function generateCircuitInputEncoderJs(encoderName, inputSignals, config) {
  return ejs.render(circuitInputEncoderTpl, {encoderName, inputSignals, config})
}

// TODO: rewrite this function using template
function generateCircuitInputDecoderCircom(inputSignals, indent=4) {
const encodedSignalsName="in";
let code = '';
function addLine(text) {
    code += ' '.repeat(indent) + text + '\n';
}
addLine("// **************** CODEGEN START **************")
addLine(`signal input ${encodedSignalsName}[${config.txLength}];`)
for(let i = 0; i < inputSignals.length; i++) {
  addLine(`signal ${inputSignals[i]};`);
}
for(let i = 0; i < inputSignals.length; i++) {
  addLine(`${inputSignals[i]} <== ${encodedSignalsName}[${i}];`);
}
addLine("// **************** CODEGEN END **************")
// generate js encoding code.
// it is a bit wired to put codes here.. so codegen implys side effect.. FIX later

//let encodingCode = generateEncodingCode(encoderName, inputSignals);/
//const w = path.join(path.dirname(__filename), "..", "test", "codec", changeCase.snakeCase(encoderName) + ".ts");
//fs.writeFileSync(w, encodingCode);

return code;
}
function renderTemplateOld(txt) {
  const r = /\/\*codegen:start([\s\S]+?)codegen:end\*\//;
  let m = txt.match(r);
  while (m) {
    const macro = m[1];
    const code = eval(macro);
    txt = txt.replace(r, code);
    m = txt.match(r);
  }
  return txt;
}
function main() {
  let tpl = fs.readFileSync(process.stdin.fd, 'utf-8');
  const result = ejs.render(tpl, {codegen})
  console.log(result);
}
main();
