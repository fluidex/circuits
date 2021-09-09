const JsInputEncoderTpl = `import { TxLength } from '../common';
import { assert } from 'console';
class <%= encoderName %> {<% for (const s of inputSignals) { %>
  <%= s %>: bigint;<% } %>
  encode(): Array<bigint> {
    // double check template config is consistent
    assert(TxLength == <%= config.txLength %>, 'invalid length, check your template config');
    let results = [];<% for (const s of inputSignals) { %>
    results.push(this.<%= s %>);<% } %>
    while (results.length < TxLength) {
      results.push(0n);
    }
    for (const x of results) {
      if (x == null) {
        throw new Error('signal not assigned ' + results);
      }
    }
    return results;
  }
}
export { <%= encoderName %> };
`;

const RsInputEncoderTpl = `#![allow(non_snake_case)]
#![allow(clippy::assertions_on_constants)]
use crate::state::common::TX_LENGTH;
use crate::state::types::Fr;
use ff::Field;
#[derive(Default)]
pub struct <%= encoderName %> {<% for (const s of inputSignals) { %>
    pub <%= s %>: Fr,<% } %>
}

impl <%= encoderName %> {
    pub fn encode(self) -> Vec<Fr> {
        // double check template config is consistent
        assert!(TX_LENGTH == <%= config.txLength %>, "invalid length, check your template config");
        let mut results = vec![<% for (const s of inputSignals) { %>
            self.<%= s %>,<% } %>
        ];
        while results.len() < TX_LENGTH {
            results.push(Fr::zero());
        }
        results
    }
}`;

const CheckEqTpl = `component checkEq__ = ForceEqualIfEnabled();
    checkEq__.enabled <== enabled;
    checkEq__.in[0] <== lhs;
    checkEq__.in[1] <== rhs;
`;

const MultiCheckEqTpl = `
<% for (let i in items) { %>
    component checkEq__<%= i %> = ForceEqualIfEnabled();
    checkEq__<%= i %>.enabled <== enabled;
    checkEq__<%= i %>.in[0] <== <%= items[i][0] %>;
    checkEq__<%= i %>.in[1] <== <%= items[i][1] %>;
<% } %>
`;

const LoopAssignTpl = `    for (var <%= loopVar %> = 0; <%= loopVar %> < <%= loopCount %>; <%= loopVar %>++) {
    <% for (const item of assignItems) { %>        <%= item[0] %>[<%= loopVar %>] <== <%= item[1] %>[<%= loopVar %>];
    <% } %>    }`;

function generateMultiAssign(comp, fields, prefix, suffix = '', indent = 8) {
  let output = '\n';
  for (const f of fields) {
    output += ' '.repeat(indent) + `${comp}.${f} <== ${prefix}${f}${suffix};\n`;
  }
  return output;
}

const CalcBalanceTreeTpl = `
    component balanceTree__ = CalculateRootFromMerklePath(balanceLevels);
    balanceTree__.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTree__.pathIndex[i] <== balancePathIndex[i];
        balanceTree__.pathElements[i][0] <== balancePathElements[i][0];
    }`;

const CheckBalanceTreeTpl = `
    ${CalcBalanceTreeTpl}
    ${CheckEqTpl.replace('lhs', 'balanceTree__.root').replace('rhs', 'balanceRoot')}`;

const CalcOrderTreeTpl = `
    component orderHash__ = HashOrder();
    orderHash__.tokenSell <== orderTokenSell;
    orderHash__.tokenBuy <== orderTokenBuy;
    orderHash__.filledSell <== orderFilledSell;
    orderHash__.filledBuy <== orderFilledBuy;
    orderHash__.totalSell <== orderAmountSell;
    orderHash__.totalBuy <== orderAmountBuy;
    orderHash__.orderId <== orderID;

    // - check order tree update
    component orderTree__ = CalculateRootFromMerklePath(orderLevels);
    orderTree__.leaf <== orderHash__.out;
    for (var i = 0; i < orderLevels; i++) {
        orderTree__.pathIndex[i] <== orderPathIndex[i];
        orderTree__.pathElements[i][0] <== orderPathElements[i][0];
    }`;

const CheckOrderTreeTpl = `
    ${CalcOrderTreeTpl}
    ${CheckEqTpl.replace('lhs', 'orderTree__.root').replace('rhs', 'orderRoot')}`;

const CalcAccountTreeTpl = `
    // account state hash
    component accountHash__ = HashAccount();
    accountHash__.nonce <== nonce;
    accountHash__.sign <== sign;
    accountHash__.balanceRoot <== balanceRoot;
    accountHash__.ay <== ay;
    accountHash__.ethAddr <== ethAddr;
    accountHash__.orderRoot <== orderRoot;
    // check account tree
    component accountTree__ = CalculateRootFromMerklePath(accountLevels);
    accountTree__.leaf <== accountHash__.out;
    for (var i = 0; i < accountLevels; i++) {
        accountTree__.pathIndex[i] <== accountPathIndex[i];
        accountTree__.pathElements[i][0] <== accountPathElements[i][0];
    }`;

const CheckAccountTreeRootTpl = CheckEqTpl.replace('lhs', 'accountTree__.root').replace('rhs', 'accountRoot');

const CheckAccountTreeTpl = `
    ${CalcAccountTreeTpl}
    ${CheckAccountTreeRootTpl}`;

const CalcAccountTreeFromBalanceTpl = `
    ${CalcBalanceTreeTpl}
    ${CalcAccountTreeTpl.replaceAll(' balanceRoot', ' balanceTree__.root')}`;

const CheckAccountTreeFromBalanceTpl = `
    ${CalcAccountTreeFromBalanceTpl}
    ${CheckAccountTreeRootTpl}`;

const CalcAccountTreeFromOrderTpl = `
    ${CalcOrderTreeTpl}
    ${CalcAccountTreeTpl.replaceAll(' orderRoot', ' orderTree__.root')}`;

const CheckAccountTreeFromOrderTpl = `
    ${CalcAccountTreeFromOrderTpl}
    ${CheckAccountTreeRootTpl}`;

/*
// SameRoot is just another name for
const CheckSameStateRootTpl = `
    ${CheckAccountTreeFromBalanceTpl.replace()}
    ${CalcAccountTreeTpl}
    `;
*/

const CheckSameTreeRootTpl = `
    component tree1__ = CalculateRootFromMerklePath( levels);
    tree1__.leaf <== leaf1;
    for (var i = 0; i < levels; i++) {
        tree1__.pathIndex[i] <== pathIndex1[i];
        tree1__.pathElements[i][0] <== pathElements1[i][0];
    }

    component tree2__ = CalculateRootFromMerklePath( levels);
    tree2__.leaf <== leaf2;
    for (var i = 0; i < levels; i++) {
        tree2__.pathIndex[i] <== pathIndex2[i];
        tree2__.pathElements[i][0] <== pathElements2[i][0];
    }
    component check__ = ForceEqualIfEnabled();
    check__.enabled <== enabled;
    check__.in[0] <== tree1__.root;
    check__.in[1] <== tree2__.root;
`;

const universalBalanceCheckTplFn = function (compName, prefix, suffix) {
  return `${compName} = BalanceChecker(balanceLevels, accountLevels);
        ${compName}.enabled <== enabled;
        ${compName}.accountRoot <== accountRoot;
        ${compName}.orderRoot <== orderRoot;
        ${compName}.tokenID <== tokenID;
${generateMultiAssign(compName, ['accountID', 'ethAddr', 'sign', 'ay', 'nonce', 'balance'], prefix, suffix, 8)}
        for (var j = 0; j < balanceLevels; j++) {
            ${compName}.balancePathElements[j][0] <== balancePathElements[j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            ${compName}.accountPathElements[j][0] <== accountPathElements[j][0];
        }
`;
};

const DAProtocolUtilsTplFn = function (floatLength) {
  return `
//currently only the least packing for transfer tx ...
//so accountID * 2 + tokenID + amount

function TxDataLength(accountLevels, tokenLevels) { return accountLevels * 2 + tokenLevels + ${floatLength}; }
function FloatLength() { return ${floatLength};}
`;
};

export {
  JsInputEncoderTpl,
  RsInputEncoderTpl,
  CheckBalanceTreeTpl,
  CheckOrderTreeTpl,
  CalcOrderTreeTpl,
  CalcAccountTreeFromBalanceTpl,
  CheckAccountTreeFromBalanceTpl,
  CheckAccountTreeFromOrderTpl,
  CheckSameTreeRootTpl,
  LoopAssignTpl,
  CheckEqTpl,
  MultiCheckEqTpl,
  DAProtocolUtilsTplFn,
  universalBalanceCheckTplFn,
  generateMultiAssign,
};
