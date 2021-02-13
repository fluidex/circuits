import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType, getBTreeProof } from './common';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = getGenesisOrderRoot();

function initTestCase() {
  const accountID1 = 1;
  const account1 = new Account(111);
  const ethAddr1NoPrefix = account1.ethAddr.replace('0x', '');
  const accountID2 = 0;
  const account2 = new Account(222);
  const ethAddr2NoPrefix = account2.ethAddr.replace('0x', '');

  const tokenID_1to2 = 1;
  const tokenID_2to1 = 2;
  const amount_1to2 = 120n;
  const amount_2to1 = 210n;

  const nonce1 = 11;
  const account1_balance_sell = 199n;
  const account1_balance_buy = 111n;
  let account1BalanceLeaves = [];
  for (let i = 0; i < 2**balanceLevels; i++) account1BalanceLeaves.push(11n + BigInt(i));
  account1BalanceLeaves[tokenID_1to2] = account1_balance_sell;
  account1BalanceLeaves[tokenID_2to1] = account1_balance_buy;
  // TODO:
  // let oldAccount1BalanceProof = getBTreeProof(account1BalanceLeaves, tokenID_1to2);

  const nonce2 = 22;
  const account2_balance_sell = 299n;
  const account2_balance_buy = 211n;
  let account2BalanceLeaves = [];
  for (let i = 0; i < 2**balanceLevels; i++) account2BalanceLeaves.push(11n + BigInt(i));
  account2BalanceLeaves[tokenID_1to2] = account2_balance_sell;
  account2BalanceLeaves[tokenID_2to1] = account2_balance_buy;
  // TODO:
  // let oldAccount2BalanceProof = getBTreeProof(account2BalanceLeaves, tokenID_1to2);


  return {
    enabled: 1,
    accountID1: accountID1,
    accountID2: accountID2,
    amount_1to2: amount_1to2,
    amount_2to1: amount_2to1,
    tokenID_1to2: tokenID_1to2,
    tokenID_2to1: tokenID_2to1,
    nonce1: nonce1,
    sign1: account1.sign,
    account1_balance_sell: account1_balance_sell,
    account1_balance_buy: account1_balance_buy,
    ay1: Scalar.fromString(account1.ay, 16),
    ethAddr1: Scalar.fromString(ethAddr1NoPrefix, 16),
    // TODO: old_account1_balance_path_elements: oldAccount1BalanceProof.path_elements,
    // TODO: tmp_account1_balance_path_elements: oldAccount1BalanceProof.path_elements,
    // TODO: old_account1_path_elements: oldAccount1BalanceProof.path_elements,

    nonce2: nonce2,
    sign2: account2.sign,
    account2_balance_sell: account2_balance_sell,
    account2_balance_buy: account2_balance_buy,
    ay2: Scalar.fromString(account2.ay, 16),
    ethAddr2: Scalar.fromString(ethAddr2NoPrefix, 16),
    // TODO: old_account2_balance_path_elements
    // TODO: tmp_account2_balance_path_elements
    // TODO: tmp_account2_path_elements
  };
}

let test_case = initTestCase();
class TestSpotTrade implements SimpleTest {
  getInput() {
    return {
      enabled: test_case.enabled,    
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'spot_trade.circom'),
      main: `SpotTrade(${orderLevels}, ${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestSpotTrade };
