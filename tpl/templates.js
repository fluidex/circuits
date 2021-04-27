const circuitInputEncoderJsTpl = `import { TxLength } from '../common';
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

const circuitInputEncoderRsTpl = `#![allow(non_snake_case)]
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
        accountTree__.path_index[i] <== account_path_index[i];
        accountTree__.path_elements[i][0] <== account_path_elements[i][0];
    }`;

const CheckAccountTreeRootTpl = `component check__ = ForceEqualIfEnabled();
    check__.enabled <== enabled;
    check__.in[0] <== accountTree__.root;
    check__.in[1] <== accountRoot;
`;

// name__ is component name, this can be randomly named like tmpAFSdfewd.
// here we transform name__ uniformly to name${suffix} like nameNew nameOld name0 name1 name2
// we also assume some global vars like enabled / balanceLevels / accountLevels
const CheckAccountTreeTpl = `
    ${CalcAccountTreeTpl}
    ${CheckAccountTreeRootTpl}
`;

const CalcAccountTreeFromBalanceTpl = `component balanceTree__ = CalculateRootFromMerklePath(balanceLevels);
    balanceTree__.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
        balanceTree__.path_index[i] <== balance_path_index[i];
        balanceTree__.path_elements[i][0] <== balance_path_elements[i][0];
    }
    ${CalcAccountTreeTpl.replaceAll(' balanceRoot', ' balanceTree__.root')}
`;

const CheckFullBalanceTreeTpl = `
    ${CalcAccountTreeFromBalanceTpl}
    ${CheckAccountTreeRootTpl}
    `;

const CheckSameStateRootTpl = `
    ${CheckFullBalanceTreeTpl.replace()}

    ${CalcAccountTreeTpl}
    `;
// SameRoot is just another name for
const CheckSameTreeRootTpl = `
    component tree1__ = CalculateRootFromMerklePath( levels);
    tree1__.leaf <== leaf1;
    for (var i = 0; i < levels; i++) {
        tree1__.path_index[i] <== path_index1[i];
        tree1__.path_elements[i][0] <== path_elements1[i][0];
    }

    component tree2__ = CalculateRootFromMerklePath( levels);
    tree2__.leaf <== leaf2;
    for (var i = 0; i < levels; i++) {
        tree2__.path_index[i] <== path_index2[i];
        tree2__.path_elements[i][0] <== path_elements2[i][0];
    }
    component check__ = ForceEqualIfEnabled();
    check__.enabled <== enabled;
    check__.in[0] <== tree1__.root;
    check__.in[1] <== tree2__.root;
`;
const CheckBalanceTreeTpl = `
    component balanceChecker__ = CheckLeafExists(balanceLevels);
    balanceChecker__.enabled <== enabled;
    balanceChecker__.leaf <== leaf;
    for (var i = 0; i < balanceLevels; i++) {
        balanceChecker__.path_index[i] <== balance_path_index[i];
        balanceChecker__.path_elements[i][0] <== balance_path_elements[i][0];
    }
    balanceChecker__.root <== root;
    `;

const CheckOrderTreeTpl = `
`;
const CalcFullTreeTpl = `
`;
const CheckFullOrderTreeTpl = `
    component orderHash__ = HashOrder();
    orderHash__.tokensell <== order_tokensell;
    orderHash__.tokenbuy <== order_tokenbuy;
    orderHash__.filled_sell <== order_filledsell;
    orderHash__.filled_buy <== order_filledbuy;
    orderHash__.total_sell <== order_amountsell;
    orderHash__.total_buy <== order_amountbuy;
    orderHash__.order_id <== order_id;

    // - check order tree update
    component orderTree__ = CheckLeafExists(orderLevels);
    orderTree__.enabled <== enabled;
    orderTree__.leaf <== orderHash__.out;
    for (var i = 0; i < orderLevels; i++) {
        orderTree__.path_index[i] <== order_path_index[i];
        orderTree__.path_elements[i][0] <== order_path_elements[i][0];
    }
    orderTree__.root <== orderRoot;

    ${CheckAccountTreeTpl.replaceAll(' orderRoot', ' orderTree__.root')}
    `;

export {
  circuitInputEncoderJsTpl,
  circuitInputEncoderRsTpl,
  CheckBalanceTreeTpl,
  CheckOrderTreeTpl,
  CheckFullBalanceTreeTpl,
  CheckFullOrderTreeTpl,
  CheckSameTreeRootTpl,
  CalcAccountTreeFromBalanceTpl,
};
