import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { getBTreeProof } from '../helper.ts/binary_merkle_tree';
import { hashAccountState, hashOrderState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType } from './common';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new common.GlobalState(orderLevels, balanceLevels, accountLevels);

  const account1 = new Account(111);
  const account2 = new Account(222);
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  // trade token
  const tokenID_1to2 = 1;
  const tokenID_2to1 = 2;
  // trade amount
  const amount_1to2 = 120n;
  const amount_2to1 = 1200n;

  /// set up initial accounts
  // account 1
  const nonce1 = 11;
  const account1_balance_sell = 199n;
  const account1_balance_buy = 111n;
  state.setAccountKey(accountID1, account1.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID_1to2) {
      state.setTokenBalance(accountID1, tokenID_1to2, account1_balance_sell);
    } else if (BigInt(i) == tokenID_2to1) {
      state.setTokenBalance(accountID1, tokenID_2to1, account1_balance_buy);
    } else {
      state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID1, nonce1);
  // account 2
  const nonce2 = 22;
  const account2_balance_sell = 1990n;
  const account2_balance_buy = 1110n;
  state.setAccountKey(accountID2, account1.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID_2to1) {
      state.setTokenBalance(accountID2, tokenID_2to1, account2_balance_sell);
    } else if (BigInt(i) == tokenID_1to2) {
      state.setTokenBalance(accountID2, tokenID_1to2, account2_balance_buy);
    } else {
      state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID2, nonce2);

  /// set up orders
  // order1
  const order1_id = 1;
  const order1_amountsell = 1000;
  const order1_amountbuy = 10000;
  const oldOrder1 = {
    status: 0, // open
    tokenbuy: tokenID_2to1,
    tokensell: tokenID_1to2,
    filled_sell: 0n,
    filled_buy: 0n,
    total_sell: order1_amountsell,
    total_buy: order1_amountbuy,
  };
  state.setAccountOrder(accountID1, order1_id, oldOrder1);

  // order2
  const order2_id = 1;
  const order2_amountsell = 10000;
  const order2_amountbuy = 1000;
  const oldOrder2 = {
    status: 0, // open
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 10n,
    filled_buy: 1n,
    total_sell: order2_amountsell,
    total_buy: order2_amountbuy,
  };
  state.setAccountOrder(accountID2, order2_id, oldOrder2);

  let spotTradeTx = {
  };
  state.SpotTrade(spotTradeTx);

  // const oldAccount1 = {
  //   nonce: nonce1,
  //   sign: account1.sign,
  //   balanceRoot: oldAccount1BalanceProof.root,
  //   ay: account1.ay,
  //   ethAddr: ethAddr1NoPrefix,
  //   orderRoot: oldOrder1Proof.root,
  // };
  // const oldAccount1Hash = hashAccountState(oldAccount1);
  // const oldAccount2 = {
  //   nonce: nonce2,
  //   sign: account2.sign,
  //   balanceRoot: oldAccount2BalanceProof.root,
  //   ay: account2.ay,
  //   ethAddr: ethAddr2NoPrefix,
  //   orderRoot: oldOrder2Proof.root,
  // };
  // const oldAccount2Hash = hashAccountState(oldAccount2);
  // let accountLeaves = [];
  // for (let i = 0; i < 2 ** accountLevels; i++) accountLeaves.push(44n + BigInt(i));
  // accountLeaves[accountID1] = oldAccount1Hash;
  // accountLeaves[accountID2] = oldAccount2Hash;
  // let oldAccount1Proof = getBTreeProof(accountLeaves, accountID1);

  // /// new
  // account1BalanceLeaves[tokenID_1to2] -= amount_1to2;
  // let tmpAccount1BalanceProof = getBTreeProof(account1BalanceLeaves, tokenID_2to1);
  // account1BalanceLeaves[tokenID_2to1] += amount_2to1;
  // let newAccount1BalanceProof = getBTreeProof(account1BalanceLeaves, tokenID_2to1);

  // account2BalanceLeaves[tokenID_2to1] -= amount_2to1;
  // let tmpAccount2BalanceProof = getBTreeProof(account2BalanceLeaves, tokenID_1to2);
  // account2BalanceLeaves[tokenID_1to2] += amount_1to2;
  // let newAccount2BalanceProof = getBTreeProof(account2BalanceLeaves, tokenID_1to2);

  // let newOrder1 = {
  //   status: oldOrder1.status, // open
  //   tokenbuy: oldOrder1.tokenbuy,
  //   tokensell: oldOrder1.tokensell,
  //   filled_sell: oldOrder1.filled_sell + amount_1to2,
  //   filled_buy: oldOrder1.filled_buy + amount_2to1,
  //   total_sell: oldOrder1.total_sell,
  //   total_buy: oldOrder1.total_buy,
  // };
  // const newOrder1Hash = hashOrderState(newOrder1);
  // account1Orders[order1_id] = newOrder1Hash;
  // let newOrder1Proof = getBTreeProof(account1Orders, order1_id);

  // let newOrder2 = {
  //   status: oldOrder2.status, // open
  //   tokenbuy: oldOrder2.tokenbuy,
  //   tokensell: oldOrder2.tokensell,
  //   filled_sell: oldOrder2.filled_sell + amount_2to1,
  //   filled_buy: oldOrder2.filled_buy + amount_1to2,
  //   total_sell: oldOrder2.total_sell,
  //   total_buy: oldOrder2.total_buy,
  // };
  // const newOrder2Hash = hashOrderState(newOrder2);
  // account2Orders[order2_id] = newOrder2Hash;
  // let newOrder2Proof = getBTreeProof(account2Orders, order2_id);

  // let newAccount1 = {
  //   nonce: oldAccount1.nonce,
  //   sign: oldAccount1.sign,
  //   balanceRoot: newAccount1BalanceProof.root,
  //   ay: oldAccount1.ay,
  //   ethAddr: oldAccount1.ethAddr,
  //   orderRoot: newOrder1Proof.root,
  // };
  // const newAccount1Hash = hashAccountState(newAccount1);
  // let newAccount2 = {
  //   nonce: oldAccount2.nonce,
  //   sign: oldAccount2.sign,
  //   balanceRoot: newAccount2BalanceProof.root,
  //   ay: oldAccount2.ay,
  //   ethAddr: oldAccount2.ethAddr,
  //   orderRoot: newOrder2Proof.root,
  // };
  // const newAccount2Hash = hashAccountState(newAccount2);
  // accountLeaves[accountID1] = newAccount1Hash;
  // let tmpAccount2Proof = getBTreeProof(accountLeaves, accountID2);
  // accountLeaves[accountID2] = newAccount2Hash;
  // let newAccount2Proof = getBTreeProof(accountLeaves, accountID2);

  let block = state.forge();
  // TODO: assert length
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
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    order1_account_nonce: nonce1,
    order2_account_nonce: nonce2,
    order1_account_sign: account1.sign,
    order2_account_sign: account2.sign,
    order1_account_ay: Scalar.fromString(account1.ay, 16),
    order2_account_ay: Scalar.fromString(account2.ay, 16),
    order1_account_ethAddr: Scalar.fromString(account1.ethAddr, 16),
    order2_account_ethAddr: Scalar.fromString(account2.ethAddr, 16),
    order1_token_sell_balance: account1_balance_sell,
    order1_token_buy_balance: account1_balance_buy,
    order2_token_sell_balance: account2_balance_sell,
    order2_token_buy_balance: account2_balance_buy,
    order_path_elements: block.order_path_elements,
    old_account_root: block.oldAccountRoots[block.oldAccountRoots.length-1],
    new_account_root: block.newAccountRoots[block.newAccountRoots.length-1],
    old_account1_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][0], // oldAccount1BalanceProof.path_elements, order1 sender
    tmp_account1_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][1], // tmpAccount1BalanceProof.path_elements, ???
    old_account1_path_elements: block.account_path_elements[block.account_path_elements.length-1][0], // oldAccount1Proof.path_elements,
    old_account2_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][2], // oldAccount2BalanceProof.path_elements, order2 sender
    tmp_account2_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][3], // tmpAccount2BalanceProof.path_elements, ???
    tmp_account2_path_elements: block.account_path_elements[block.account_path_elements.length-1][1], // tmpAccount2Proof.path_elements,
  };
}

let test_case = initTestCase();
class TestSpotTrade implements SimpleTest {
  getInput() {
    return {
      enabled: test_case.enabled,
      order1_id: test_case.order1_id,
      order1_tokensell: test_case.order1_tokensell,
      order1_amountsell: test_case.order1_amountsell,
      order1_tokenbuy: test_case.order1_tokenbuy,
      order1_amountbuy: test_case.order1_amountbuy,
      order2_id: test_case.order2_id,
      order2_tokensell: test_case.order2_tokensell,
      order2_amountsell: test_case.order2_amountsell,
      order2_tokenbuy: test_case.order2_tokenbuy,
      order2_amountbuy: test_case.order2_amountbuy,
      amount_2to1: test_case.amount_2to1,
      amount_1to2: test_case.amount_1to2,
      order1_filledsell: test_case.order1_filledsell,
      order1_filledbuy: test_case.order1_filledbuy,
      order2_filledsell: test_case.order2_filledsell,
      order2_filledbuy: test_case.order2_filledbuy,
      order1_accountID: test_case.order1_accountID,
      order2_accountID: test_case.order2_accountID,
      order1_account_nonce: test_case.order1_account_nonce,
      order2_account_nonce: test_case.order2_account_nonce,
      order1_account_sign: test_case.order1_account_sign,
      order2_account_sign: test_case.order2_account_sign,
      order1_account_ay: test_case.order1_account_ay,
      order2_account_ay: test_case.order2_account_ay,
      order1_account_ethAddr: test_case.order1_account_ethAddr,
      order2_account_ethAddr: test_case.order2_account_ethAddr,
      order1_token_sell_balance: test_case.order1_token_sell_balance,
      order1_token_buy_balance: test_case.order1_token_buy_balance,
      order2_token_sell_balance: test_case.order2_token_sell_balance,
      order2_token_buy_balance: test_case.order2_token_buy_balance,
      order_path_elements: test_case.order_path_elements,
      old_account_root: test_case.old_account_root,
      new_account_root: test_case.new_account_root,
      old_account1_balance_path_elements: test_case.old_account1_balance_path_elements,
      tmp_account1_balance_path_elements: test_case.tmp_account1_balance_path_elements,
      old_account1_path_elements: test_case.old_account1_path_elements,
      old_account2_balance_path_elements: test_case.old_account2_balance_path_elements,
      tmp_account2_balance_path_elements: test_case.tmp_account2_balance_path_elements,
      tmp_account2_path_elements: test_case.tmp_account2_path_elements,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'spot_trade.circom'),
      main: `SpotTrade(${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

export { TestSpotTrade };
