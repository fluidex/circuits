const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const printDiff = require('print-diff');
const { config } = require('./config');
const tpls = require('./templates');
const { assert } = require('console');

// codegen is the module to inject inside the ejs template system
const codegen = {
  config,
  tpls,
  dataEncode: synthesisDAParams(config.dataEncodeSchemes),
  // renderXXX uses ejs template
  renderInputEncoderJs,
  renderInputEncoderRs,
  renderInputDecoderCircom,
  renderLoopAssign,
  renderDAEncoderInput,
  renderDAEncodeField,
  generateUniversalBalanceCheck,
  // generateXXX uses simple str.replace
  generateBalanceCheckCircom,
  generateOrderCheckCircom,
  generateSameRootCircom,
  generateCheckEq,
  generateFromTpl,
  generateMultiFieldsAssign,
  generateMultiCheckEq,
  generateDALengthCheckBlock,
  generatedDAHeadingBlock,
  // helper function to convert camel case to all cap case
  capitalization,
  camelToAllCap,
};

function renderInputEncoderJs(encoderName, inputSignals, config) {
  return ejs.render(tpls.JsInputEncoderTpl, { encoderName, inputSignals, config });
}
function renderLoopAssign(assignItems, loopVar, loopCount) {
  return ejs.render(tpls.LoopAssignTpl, { assignItems, loopVar, loopCount });
}
function renderInputEncoderRs(encoderName, inputSignals, config) {
  return ejs.render(tpls.RsInputEncoderTpl, { encoderName, inputSignals, config });
}
function generateMultiFieldsAssign(comp, fields, prefix, suffix = '', indent = 8) {
  return tpls.generateMultiAssign(comp, fields, prefix, suffix, indent);
}
function generateUniversalBalanceCheck(compName, prefix, suffix, { ctx, replacers }) {
  const tpl = tpls.universalBalanceCheckTplFn(compName, prefix, suffix);
  return generateFromTpl(tpl, { ctx, replacers });
}
function generateOrderCheckCircom({ ctx, replacers }) {
  return generateFromTpl(tpls.CheckAccountTreeFromOrderTpl, { ctx, replacers });
}
function generateBalanceCheckCircom({ ctx, replacers }) {
  return generateFromTpl(tpls.CheckAccountTreeFromBalanceTpl, { ctx, replacers });
}
function generateSameRootCircom({ ctx, replacers }) {
  return generateFromTpl(tpls.CheckSameTreeRootTpl, { ctx, replacers });
}
function generateCheckEq({ ctx, replacers }) {
  return generateFromTpl(tpls.CheckEqTpl, { ctx, replacers });
}
function generateMultiCheckEq(items, { ctx, replacers }) {
  const tpl = ejs.render(tpls.MultiCheckEqTpl, { items });
  return generateFromTpl(tpl, { ctx, replacers });
}
function camelToAllCap(str) {
  // Split camel case str by capital letters except for 'D' in 'ID'.
  const result = str.replace(/((?!(?<=I)D)[A-Z])/g, ' $1');
  return result.split(' ').join('_').toUpperCase();
}
function capitalization(str){
  return str[0].toUpperCase() + str.slice(1);
} 
function renderDAEncoderInput(encoderName, inputName,
  fields = codegen.dataEncode.fields, txIdx = config.txIdx) {

  return ejs.render(tpls.DAProtocolInputFieldTpl, 
    {encoder: encoderName, input: inputName, fields, txIdx})
}

function renderDAEncodeField(scheme, [fieldName, fieldBits, fieldRelaxed]) {
  return ejs.render(tpls.DAProtocolEncodeFieldTpl, {
    scheme: capitalization(scheme), 
    unCapFieldName: fieldName,
    fieldName: capitalization(fieldName), 
    fieldBits, relaxed: fieldRelaxed})
}
//protocol is [[<FieldName>, <bits>]]
//bits fields can be: balanceLevels, orderLevels, accountLevels, floats, addrs, or any number
//default ctx is set to scheme's name, _ret can be replaced as the checking variable, 
//and bits fields' name can also be replaced
function generateDALengthCheckBlock(scheme, { ctx, replacers }) {
  const tpl = tpls.DAProtocolLengthCheckTplFn(config.dataEncodeSchemes[scheme]);
  //always replace floats and addrs
  //TODO: addrs is still being hardcoded
  return generateFromTpl(tpl, {ctx: ctx || capitalization(scheme), 
    replacers: Object.assign({floats: `${config.floatLength}`, addrs: '254'}, replacers)});
}

function generatedDAHeadingBlock(scheme, { ctx, replacers = {} }) {
  const tpl = tpls.DAProtocolHeadingTplFn(scheme);
  return generateFromTpl(tpl, {ctx: ctx || capitalization(scheme), replacers});
}

function synthesisDAParams(schemes) {
  let fields = {};
  for (const n in schemes){
    schemes[n].reduce(
      (out, [item]) => {
        assert(config.txIdx[item], `field ${item} must be one of the payload`);
        out[item] = true
        return out
      }, fields);
  }

  tpls.DAProtocolHeadingTplFn().reduce((out, item) => {
    assert(config.txIdx[item], `field ${item} must be one of the payload`);
    out[item] = true
    return out
  }, fields);

  return {schemes, fields}
}
//console.log(codegen.dataEncode)
//console.log(generateDALengthCheckBlock({ctx: 'spotTrade', replacers: {'_ret': 'ret'}}));
//console.log(renderDAEncodeField('spotTrade', 'amount1', 'accountLevels'));

// replace '__' with ctx, for all {k:v} in replacers, replace ` ${k}` with ` ${v}`
function generateFromTpl(tpl, { ctx, replacers }) {
  if (!tpl) {
    //throw new Error('valid tpl ' + ctx.toString() + ' ' + replacers.toString())
  }
  let output = tpl.replaceAll('__', ctx);
  for (let k of Object.keys(replacers)) {
    // only replace signals
    // currently we use str.replace(' old', ' new') to avoid replace component member
    // TODO: using correct semantic/grammer analysis
    const r = ` ${k}\\b`;
    output = output.replaceAll(new RegExp(r, 'g'), ' ' + replacers[k]);
  }
  return output;
}

// TODO: rewrite this function using template
function renderInputDecoderCircom(inputSignals, indent = 4) {
  const encodedSignalsName = 'in';
  let code = '';
  function addLine(text) {
    code += ' '.repeat(indent) + text + '\n';
  }
  addLine(`signal input ${encodedSignalsName}[TxLength()];`);
  for (let i = 0; i < inputSignals.length; i++) {
    addLine(`signal ${inputSignals[i]};`);
  }
  for (let i = 0; i < inputSignals.length; i++) {
    addLine(`${inputSignals[i]} <== ${encodedSignalsName}[${i}];`);
  }
  return code;
}
function main() {
  const tplFile = process.argv[2];
  const outputFile = process.argv[3];
  if (!tplFile || !outputFile) {
    throw new Error('invalid argv' + process.argv);
  }
  //console.log(`generate ${outputFile} from ${tplFile}`);
  let tpl = fs.readFileSync(tplFile, 'utf-8');
  const tplFilePosix = path.normalize(tplFile).split(path.sep);
  let output = `// Generated from ${path.posix.join.apply(path.posix, tplFilePosix)}. Don't modify this file manually\n`;
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
