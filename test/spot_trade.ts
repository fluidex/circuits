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
  let oldOrder1Proof = getBTreeProof(account1Orders, order1_id);
  let newOrder1 = oldOrder1;
  newOrder1.filled_sell += amount_1to2;
  newOrder1.filled_buy += amount_2to1;
  const newOrder1Hash = hashOrderState(newOrder1);
  account1Orders[order1_id] = newOrder1Hash;
  let newOrder1Proof = getBTreeProof(account1Orders, order1_id);

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
  let oldOrder2Proof = getBTreeProof(account2Orders, order2_id);
  let newOrder2 = oldOrder2;
  newOrder2.filled_sell += amount_2to1;
  newOrder2.filled_buy += amount_1to2;
  const newOrder2Hash = hashOrderState(newOrder2);
  account2Orders[order2_id] = newOrder2Hash;
  let newOrder2Proof = getBTreeProof(account2Orders, order2_id);

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
    amount_2to1: amount_2to1,
    amount_1to2: amount_1to2,
    order1_filledsell: oldOrder1.filled_sell,
    order1_filledbuy: oldOrder1.filled_buy,
    order2_filledsell: oldOrder2.filled_sell,
    order2_filledbuy: oldOrder2.filled_buy,
    order1_path_elements: oldOrder1Proof.path_elements,
    old_order1_root: oldOrder1Proof.root,
    new_order1_root: newOrder1Proof.root,
    order2_path_elements: oldOrder2Proof.path_elements,
    old_order2_root: oldOrder2Proof.root,
    new_order2_root: newOrder2Proof.root,
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    order1_account_nonce: nonce1,
    order2_account_nonce: nonce2,
    order1_account_sign: account1.sign,
    order2_account_sign: account2.sign,
    order1_account_ay: Scalar.fromString(account1.ay, 16),
    order2_account_ay: Scalar.fromString(account2.ay, 16),
    order1_account_ethAddr: Scalar.fromString(ethAddr1NoPrefix, 16),
    order2_account_ethAddr: Scalar.fromString(ethAddr2NoPrefix, 16),
    order1_token_sell_balance: account1_balance_sell,
    order1_token_buy_balance: account1_balance_buy,
    order2_token_sell_balance: account2_balance_sell,
    order2_token_buy_balance: account2_balance_buy,

    // signal input old_account1_balance_path_elements[balanceLevels][1];
    // signal input tmp_account1_balance_path_elements[balanceLevels][1];
    // signal input old_account1_path_elements[accountLevels][1];
    // signal input old_account2_balance_path_elements[balanceLevels][1];
    // signal input tmp_account2_balance_path_elements[balanceLevels][1];
    // signal input tmp_account2_path_elements[accountLevels][1];
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
