import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const balanceLevels = 5;
const accountLevels = 5;

const genesisOrderRoot = getGenesisOrderRoot();

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, accountLevels);

  const tokenID = 2n;
  const amount = 300n;
  // set sufficient balance to transfer
  const balance1 = amount + 1n;
  const nonce1 = 51n;
  const balance2 = 200n;
  const nonce2 = 77n;

  const account1 = new Account(2);
  const accountID1 = state.createNewAccount();
  const account2 = new Account(1);
  const accountID2 = state.createNewAccount();

  // set up account1 initial state
  state.setAccountKey(accountID1, account1.publicKey);
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
  state.setAccountKey(accountID2, account2.publicKey);
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
    from: BigInt(accountID1),
    to: BigInt(accountID2),
    tokenID: BigInt(tokenID),
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
    nonce: nonce1,
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
    sender_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][0],
    sender_account_path_elements: block.account_path_elements[block.account_path_elements.length-1][0],
    nonce2: nonce2,
    sign2: account2.sign,
    balance2: balance2,
    ay2: Scalar.fromString(account2.ay, 16),
    ethAddr2: Scalar.fromString(account2.ethAddr, 16),
    orderRoot2: genesisOrderRoot,
    receiver_balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][1],
    receiver_account_path_elements: block.account_path_elements[block.account_path_elements.length-1][1],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length-1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length-1],
  };
}

let test_case = initTestCase();
class TestTransfer implements SimpleTest {
  getInput() {
    return {
      enabled: test_case.enabled,
      fromAccountID: test_case.fromAccountID,
      toAccountID: test_case.toAccountID,
      amount: test_case.amount,
      tokenID: test_case.tokenID,
      nonce: test_case.nonce,
      sigL2Hash: test_case.sigL2Hash,
      s: test_case.s,
      r8x: test_case.r8x,
      r8y: test_case.r8y,
      nonce1: test_case.nonce1,
      sign1: test_case.sign1,
      balance1: test_case.balance1,
      ay1: test_case.ay1,
      ethAddr1: test_case.ethAddr1,
      orderRoot1: test_case.orderRoot1,
      sender_balance_path_elements: test_case.sender_balance_path_elements,
      sender_account_path_elements: test_case.sender_account_path_elements,
      nonce2: test_case.nonce2,
      sign2: test_case.sign2,
      balance2: test_case.balance2,
      ay2: test_case.ay2,
      ethAddr2: test_case.ethAddr2,
      orderRoot2: test_case.orderRoot2,
      receiver_balance_path_elements: test_case.receiver_balance_path_elements,
      receiver_account_path_elements: test_case.receiver_account_path_elements,
      oldAccountRoot: test_case.oldAccountRoot,
      newAccountRoot: test_case.newAccountRoot,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'transfer.circom'),
      main: `Transfer(${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestTransfer };
