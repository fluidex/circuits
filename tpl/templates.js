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

// name__ is component name, this can be randomly named like tmpAFSdfewd.
// here we transform name__ uniformly to name${suffix} like nameNew nameOld name0 name1 name2
// we also assume some global vars like enabled / balanceLevels / accountLevels
const CheckAccountTreeTpl = `
    // account state hash
    component accountHash__ = HashAccount();
    accountHash__.nonce <== nonce;
    accountHash__.sign <== sign;
    accountHash__.balanceRoot <== balanceRoot;
    accountHash__.ay <== ay;
    accountHash__.ethAddr <== ethAddr;
    accountHash__.orderRoot <== orderRoot;
    // check account tree
    component accountChecker__ = CheckLeafExists(accountLevels);
    accountChecker__.enabled <== enabled;
    accountChecker__.leaf <== accountHash__.out;
    for (var i = 0; i < accountLevels; i++) {
      accountChecker__.path_index[i] <== account_path_index[i];
      accountChecker__.path_elements[i][0] <== account_path_elements[i][0];
    }
    accountChecker__.root <== accountRoot;
`;

const CheckBalanceTreeTpl = `
    component balanceTree__ = CalculateRootFromMerklePath(balanceLevels);
    balanceTree__.leaf <== balance;
    for (var i = 0; i < balanceLevels; i++) {
      balanceTree__.path_index[i] <== balance_path_index[i];
      balanceTree__.path_elements[i][0] <== balance_path_elements[i][0];
    }
    ${CheckAccountTreeTpl.replaceAll(' balanceRoot', ' balanceTree__.root')}
    `;

const CheckOrderTreeTpl = `
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

export { circuitInputEncoderJsTpl, circuitInputEncoderRsTpl, CheckBalanceTreeTpl, CheckOrderTreeTpl };
