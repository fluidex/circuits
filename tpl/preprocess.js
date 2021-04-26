const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const printDiff = require('print-diff');
const { config } = require('./config');
const { circuitInputEncoderJsTpl, circuitInputEncoderRsTpl, CheckOrderTreeTpl, CheckBalanceTreeTpl } = require('./templates');

// codegen is the module to inject inside the ejs template system
const codegen = {
  config,
  generateCircuitInputEncoderJs,
  generateCircuitInputEncoderRs,
  generateCircuitInputDecoderCircom,
  generateCircuitBalanceCheckCircom,
  generateCircuitOrderCheckCircom,
};

function generateCircuitInputEncoderJs(encoderName, inputSignals, config) {
  return ejs.render(circuitInputEncoderJsTpl, { encoderName, inputSignals, config });
}

function generateCircuitInputEncoderRs(encoderName, inputSignals, config) {
  return ejs.render(circuitInputEncoderRsTpl, { encoderName, inputSignals, config });
}
function generateCircuitOrderCheckCircom({ ctx, vars }) {
  return generateCircuitTreeCheckCircom(CheckOrderTreeTpl, { ctx, vars });
}
function generateCircuitBalanceCheckCircom({ ctx, vars }) {
  return generateCircuitTreeCheckCircom(CheckBalanceTreeTpl, { ctx, vars });
}
function generateCircuitTreeCheckCircom(tpl, { ctx, vars }) {
  let output = tpl.replaceAll('__', ctx);
  for (let k of Object.keys(vars)) {
    // only replace signals
    // currently we use str.replace(' old', ' new') to avoid replace component member
    // TODO: using correct semantic/grammer analysis
    const r = ` ${k}\\b`;
    output = output.replaceAll(new RegExp(r, 'g'), ' ' + vars[k]);
  }
  return output;
}

// TODO: rewrite this function using template
function generateCircuitInputDecoderCircom(inputSignals, indent = 4) {
  const encodedSignalsName = 'in';
  let code = '';
  function addLine(text) {
    code += ' '.repeat(indent) + text + '\n';
  }
  addLine('// **************** CODEGEN START **************');
  addLine(`signal input ${encodedSignalsName}[${config.txLength}];`);
  for (let i = 0; i < inputSignals.length; i++) {
    addLine(`signal ${inputSignals[i]};`);
  }
  for (let i = 0; i < inputSignals.length; i++) {
    addLine(`${inputSignals[i]} <== ${encodedSignalsName}[${i}];`);
  }
  addLine('// **************** CODEGEN END **************');
  return code;
}
function main() {
  const tplFile = process.argv[2];
  const outputFile = process.argv[3];
  if (!tplFile || !outputFile) {
    throw new Error('invalid argv' + process.argv);
  }
  console.log(`generate ${outputFile} from ${tplFile}`);
  let tpl = fs.readFileSync(tplFile, 'utf-8');
  let output = `// Generated from ${tplFile}. Don't modify this file manually\n`;
  output += ejs.render(tpl, { codegen });
  const overwrite = true;
  if (!overwrite && fs.existsSync(outputFile)) {
    const oldOutput = fs.readFileSync(outputFile, 'utf-8');
    if (output != oldOutput) {
      printDiff(oldOutput, output);
      throw new Error('dirty output. You should never modify the output file!');
    }
  }
  fs.writeFileSync(outputFile, output);
}
main();
