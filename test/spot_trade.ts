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
  const amount_2to1 = 1200n;

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
  const account2_balance_sell = 1990n;
  const account2_balance_buy = 1110n;
  let account2BalanceLeaves = [];
  for (let i = 0; i < 2**balanceLevels; i++) account2BalanceLeaves.push(11n + BigInt(i));
  account2BalanceLeaves[tokenID_1to2] = account2_balance_sell;
  account2BalanceLeaves[tokenID_2to1] = account2_balance_buy;
  // TODO:
  // let oldAccount2BalanceProof = getBTreeProof(account2BalanceLeaves, tokenID_1to2);

  const order1_id = 1;
  const order1_amountsell = 1000;
  const order1_amountbuy = 10000;
  const oldOrder1 = {
    status: 0, // open
    tokenbuy: tokenID_2to1,
    tokensell: tokenID_1to2,
    filled_sell: 0,
    filled_buy: 0,
    total_sell: order1_amountsell,
    total_buy: order1_amountbuy,
  };
  const oldOrder1Hash = hashOrderState(oldOrder1);
  let account1Orders = [];
  for (let i = 0; i < 2**orderLevels; i++) account1Orders.push(22n + BigInt(i));
  account1Orders[order1_id] = oldOrder1Hash;

  const order2_id = 1;
  const order2_amountsell = 10000;
  const order2_amountbuy = 1000;
  const oldOrder2 = {
    status: 0, // open
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 10,
    filled_buy: 1,
    total_sell: order2_amountsell,
    total_buy:order2_amountbuy,
  };
  const oldOrder2Hash = hashOrderState(oldOrder2);
  let account2Orders = [];
  for (let i = 0; i < 2**orderLevels; i++) account2Orders.push(33n + BigInt(i));
  account2Orders[order2_id] = oldOrder2Hash;

  return {
    enabled: 1,
    order1_id: order1_id,
    order1_tokensell: tokenID_1to2,
    order1_amountsell: order1_amountsell,
    order1_tokenbuy: tokenID_2to1,
    order1_amountbuy: order1_amountbuy,
    order2_id: order2_id,
    order2_tokensell: tokenID_2to1,
    order2_amountsell: order2_amountsell,
    order2_tokenbuy: tokenID_1to2,
    order2_amountbuy: order2_amountbuy,
    order1_thisget: amount_2to1,
    order2_thisget: amount_1to2,
    order1_filledsell: oldOrder1.filled_sell,
    order1_filledbuy: oldOrder1.filled_buy,
    order2_filledsell: oldOrder2.filled_sell,
    order2_filledbuy: oldOrder2.filled_buy,

//
    accountID1: accountID1,
    accountID2: accountID2,
    // amount_1to2: amount_1to2,
    // amount_2to1: amount_2to1,
    // tokenID_1to2: tokenID_1to2,
    // tokenID_2to1: tokenID_2to1,
    // nonce1: nonce1,
    // sign1: account1.sign,
    // account1_balance_sell: account1_balance_sell,
    // account1_balance_buy: account1_balance_buy,
    // ay1: Scalar.fromString(account1.ay, 16),
    // ethAddr1: Scalar.fromString(ethAddr1NoPrefix, 16),
    // // TODO: old_account1_balance_path_elements: oldAccount1BalanceProof.path_elements,
    // // TODO: tmp_account1_balance_path_elements: oldAccount1BalanceProof.path_elements,
    // // TODO: old_account1_path_elements: oldAccount1BalanceProof.path_elements,

    // nonce2: nonce2,
    // sign2: account2.sign,
    // account2_balance_sell: account2_balance_sell,
    // account2_balance_buy: account2_balance_buy,
    // ay2: Scalar.fromString(account2.ay, 16),
    // ethAddr2: Scalar.fromString(ethAddr2NoPrefix, 16),
    // // TODO: old_account2_balance_path_elements
    // // TODO: tmp_account2_balance_path_elements
    // // TODO: tmp_account2_path_elements
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
