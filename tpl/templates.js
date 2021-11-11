import { assert } from 'console';

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

const SpotTradeOrderAssignTpl = `
    <%_ for(const i of [1,2]) { -%>
        <%- target %>.order<%- i %>Pos <== <%- assigner %>.order<%- i %>Pos;
        <%- target %>.order<%- i %>AccountID <== <%- assigner %>.accountID<%- i %>;
        <%- target %>.order<%- i %>AccountNonce <== <%- assigner %>.nonce<%- i %>;
        <%- target %>.order<%- i %>AccountSign <== <%- assigner %>.sign<%- i %>;
        <%- target %>.order<%- i %>AccountAy <== <%- assigner %>.ay<%- i %>;
    <%_ } -%>

        <%- target %>.amount1to2 <== <%- assigner %>.amount1;
        <%- target %>.amount2to1 <== <%- assigner %>.amount2;
        <%- target %>.order1TokenSellBalance <== <%- assigner %>.balance1;
        // for reusing universal checker, balance2 here must be a leaf of the final merkle tree
        <%- target %>.order2TokenBuyBalance <== <%- assigner %>.balance2 - <%- assigner %>.amount1;
        <%- target %>.order2TokenSellBalance <== <%- assigner %>.balance3;
        <%- target %>.order1TokenBuyBalance <== <%- assigner %>.balance4 - <%- assigner %>.amount2;
`;
const SpotTradeAssignTpl = `
        <%_ const ind = indexed ? '[' + indexed + ']' : '' -%>
        <%- target %>.orderRoot1 <== orderRoots<%- ind %>[0];
        <%- target %>.orderRoot2 <== orderRoots<%- ind %>[1];

        for (var j = 0; j < orderLevels; j++) {
            <%- target %>.orderPathElements[0][j][0] <== orderPathElements<%- ind %>[0][j][0];
            <%- target %>.orderPathElements[1][j][0] <== orderPathElements<%- ind %>[1][j][0];
        }
        for (var j = 0; j < balanceLevels; j++) {
            <%- target %>.oldAccount1BalancePathElements[j][0] <== balancePathElements<%- ind %>[0][j][0];
            <%- target %>.tmpAccount1BalancePathElements[j][0] <== balancePathElements<%- ind %>[3][j][0];
            <%- target %>.oldAccount2BalancePathElements[j][0] <== balancePathElements<%- ind %>[2][j][0];
            <%- target %>.tmpAccount2BalancePathElements[j][0] <== balancePathElements<%- ind %>[1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            <%- target %>.oldAccount1PathElements[j][0] <== accountPathElements<%- ind %>[0][j][0];
            <%- target %>.tmpAccount2PathElements[j][0] <== accountPathElements<%- ind %>[1][j][0];
        }
        <%- target %>.oldAccountRoot <== oldAccountRoots<%- ind %>;
        <%- target %>.newAccountRoot <== newAccountRoots<%- ind %>;
`;
const BlockInputTpl = `
    // public inputs
    // TODO: replace all the public inputs with sha3 hash later
    signal input oldRoot;
    signal input newRoot;
    signal input txDataHashHi;
    signal input txDataHashLo;

    // transactions
    signal private input txsType[__];
    signal private input encodedTxs[__][ _TxLength];

    // State
    signal private input balancePathElements[__][4][balanceLevels][1]; // index meanings: [tx idx][sender, receiver, sender, receiver][levels][siblings]
    signal private input orderPathElements[__][2][orderLevels][1]; // index meanings: [tx idx][orderAccount1, orderAccount2][levels][siblings]
    signal private input accountPathElements[__][2][accountLevels][1]; // index meanings: [tx idx][sender, receiver][levels][siblings]

    // roots
    signal private input orderRoots[__][2];
    signal private input oldAccountRoots[__];
    signal private input newAccountRoots[__];
`;

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
    component truncatedOrderId__ = TruncateOrderID();
    truncatedOrderId__.orderID <== orderID;    
    orderHash__.orderId <== truncatedOrderId__.out;

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
${generateMultiAssign(compName, ['accountID', 'sign', 'ay', 'nonce', 'balance'], prefix, suffix, 8)}
        for (var j = 0; j < balanceLevels; j++) {
            ${compName}.balancePathElements[j][0] <== balancePathElements[j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            ${compName}.accountPathElements[j][0] <== accountPathElements[j][0];
        }
`;
};

const DAProtocolInputFieldTpl = `
    <%_ for(const item in fields) { -%>
    <%- encoder %>.<%- item %> <== <%- input %>[<%- txIdx[item] %>];
    <%_ } -%>
`;

const DAProtocolEncodeFieldTpl = `component encode<%- scheme %><%- fieldName %> = Num2BitsIfEnabled(<%- fieldBits %>);
    encode<%- scheme %><%- fieldName %>.in <== <%- unCapFieldName %>;
    encode<%- scheme %><%- fieldName %>.enabled <== <%- relaxed ? '0' : '1' %>;
    for (var i = 0; i < <%- fieldBits %>; i++) {
        encoded<%- scheme %>Tx[i+offset] <== use<%- scheme %>*encode<%- scheme %><%- fieldName %>.out[i];
    }
    offset += <%- fieldBits %>;`;

const DAProtocolHeadingTplFn = function (scheme) {
  switch (scheme) {
    case 'common':
      return `
    component isL2KeyUnChanged = IsZero();
    isL2KeyUnChanged.in <== isL2KeyUpdated;
    signal isRealDeposit;
    isRealDeposit <== isL2KeyUnChanged.out * isDeposit;
    use__ <== isRealDeposit + isWithdraw + isTransfer;
    encoded__Tx[0] <== 0;
    //TODO: this bit should be marked as 'fully exit' (withdraw all balance)
    encoded__Tx[1] <== 0;
    encoded__Tx[2] <== use__*isWithdraw;`;
    case 'spotTrade':
      return `
    use__ <== isSpotTrade;
    component isOrder1Filled = IsZero();
    component isOrder2Filled = IsZero();
    isOrder1Filled.in <== order1Unfilled;
    isOrder2Filled.in <== order2Unfilled;

    //this constraints ensure we can always deduce the order state from spotTrade
    assert(order1Unfilled == 0 || order2Unfilled == 0);
    order1Unfilled * order2Unfilled === 0;

    encoded__Tx[0] <== 0;
    encoded__Tx[1] <== use__*isOrder1Filled.out;
    encoded__Tx[2] <== use__*isOrder2Filled.out;`;
    case 'l2Key':
      return `
    use__ <== isL2KeyUpdated;        
    //this constraints ensure l2key can only be updated under a 'dummy' deposit tx
    signal notDepositFlag;
    notDepositFlag <== isWithdraw + isTransfer + isSpotTrade;
    isL2KeyUpdated * notDepositFlag === 0;
    //(isWithdraw + isTransfer + isSpotTrade) * isL2KeyUpdated === 0;
    amount * isL2KeyUpdated === 0;
    encoded__Tx[0] <== use__;
    encoded__Tx[1] <== 0;
    encoded__Tx[2] <== 0;`;
    default:
      assert(false, `unrecognized scheme ${scheme}`);
  }
};

const DAProtocolSchemeLengthTplFn = function (protocol) {
  assert(Array.isArray(protocol), 'must valid protocol array');

  const bitsFieldsAggr = protocol.reduce((out, [_, bitField]) => {
    if (out[bitField]) {
      out[bitField] += 1;
    } else {
      out[bitField] = 1;
    }
    return out;
  }, {});

  const lengthFormula = Object.entries(bitsFieldsAggr)
    .map(([key, val]) => `${key}*${val}`)
    .join(' + ');
  return `__ = ${lengthFormula}`;
};

export {
  BlockInputTpl,
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
  DAProtocolInputFieldTpl,
  DAProtocolEncodeFieldTpl,
  SpotTradeOrderAssignTpl,
  SpotTradeAssignTpl,
  DAProtocolSchemeLengthTplFn,
  DAProtocolHeadingTplFn,
  universalBalanceCheckTplFn,
  generateMultiAssign,
};
