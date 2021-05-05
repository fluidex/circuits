import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account, randomMnemonic } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 5;
const accountLevels = 5;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, 1);

  const tokenID = 2n;
  const amount = 300n;
  // set sufficient balance to transfer
  const balance1 = amount + 1n;
  const nonce1 = 51n;
  const balance2 = 200n;
  const nonce2 = 77n;

  const account1Mnemonic = 'recipe ship bean core moon coral spray hurt grocery person still mimic'; //randomMnemonic();
  const account1 = Account.fromMnemonic(account1Mnemonic);
  const accountID1 = state.createNewAccount();
  const account2Mnemonic = 'cover holiday payment suspect medal soup switch blood obey rocket game width'; //randomMnemonic();
  const account2 = Account.fromMnemonic(account2Mnemonic);
  const accountID2 = state.createNewAccount();
  //console.log('test transfer', { account1Mnemonic, account2Mnemonic });

  // set up account1 initial state
  state.setAccountKey(accountID1, account1);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID1, tokenID, balance1);
    } else {
      state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID1, nonce1);
  state.setAccountOrderRoot(accountID1, genesisOrderRoot);
  // set up account2 initial state
  state.setAccountKey(accountID2, account2);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID2, tokenID, balance2);
    } else {
      state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID2, nonce2);
  state.setAccountOrderRoot(accountID2, genesisOrderRoot);

  let transferTx = {
    from: accountID1,
    to: accountID2,
    tokenID: tokenID,
    amount: amount,
    signature: null,
  };
  let fullTransferTx = state.fillTransferTx(transferTx);
  // user should check fullTransferTx is consistent with transferTx before signing
  let txhash = common.hashTransfer(fullTransferTx);
  transferTx.signature = common.accountSign(account1, txhash);
  state.Transfer(transferTx);

  let block = state.forge();
  // TODO: assert length
  return {
    enabled: 1,
    fromAccountID: accountID1,
    toAccountID: accountID2,
    amount: amount,
    tokenID: tokenID,
    sigL2Hash: txhash,
    s: transferTx.signature.S,
    r8x: transferTx.signature.R8x,
    r8y: transferTx.signature.R8y,
    nonce1: nonce1,
    sign1: account1.sign,
    balance1: balance1,
    ay1: Scalar.fromString(account1.ay, 16),
    ethAddr1: Scalar.fromString(account1.ethAddr, 16),
    orderRoot1: genesisOrderRoot,
    sender_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][0],
    sender_account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][0],
    nonce2: nonce2,
    sign2: account2.sign,
    balance2: balance2,
    ay2: Scalar.fromString(account2.ay, 16),
    ethAddr2: Scalar.fromString(account2.ethAddr, 16),
    orderRoot2: genesisOrderRoot,
    receiver_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length - 1][1],
    receiver_account_path_elements: block.account_path_elements[block.account_path_elements.length - 1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length - 1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length - 1],
  };
}

let test_case = initTestCase();
class TestTransfer implements SimpleTest {
  getInput() {
    return test_case;
  }
  getOutput() {
    return {};
  }

  getTestData() {
    return [{ input: this.getInput(), output: this.getOutput(), name: this.constructor.name }];
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'transfer.circom'),
      main: `Transfer(${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestTransfer };
