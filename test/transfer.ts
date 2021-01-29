import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType, getBTreeProof } from './common';

// circuit-level definitions
const balanceLevels = 5;
const accountLevels = 5;

function initTestCase() {
    // input-level assignments and pre-processings
    const nonce = 51;
    const tokenID = 2;
    const amount = 300n;

    const fromAccountID = 2;
    const account1 = new Account(1);
    const ethAddr1NoPrefix = account1.ethAddr.replace('0x', '');
    const nonce1 = 51;
    const balance1 = 500n;

    const toAccountID = 1;
    const account2 = new Account(2);
    const ethAddr2NoPrefix = account2.ethAddr.replace('0x', '');
    const nonce2 = 77;
    const balance2 = 200n;

    // sender state
    let senderBalanceLeaves = [];
    for (let i = 0; i < 2**balanceLevels; i++) senderBalanceLeaves.push(10n + BigInt(i));
    // TODO: check index bounds
    senderBalanceLeaves[tokenID] = balance1;
    let oldSenderBalanceProof = getBTreeProof(senderBalanceLeaves, tokenID);
    senderBalanceLeaves[tokenID] = balance1 - amount;
    let newSenderBalanceProof = getBTreeProof(senderBalanceLeaves, tokenID);
    const oldSender = {
      nonce: nonce1,
      sign: account1.sign,
      balanceRoot: oldSenderBalanceProof.root,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const oldSenderHash = hashAccountState(oldSender);
    const newSender = {
      nonce: nonce1 + 1,
      sign: account1.sign,
      balanceRoot: newSenderBalanceProof.root,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const newSenderHash = hashAccountState(newSender);

    // receiver state
    let receiverBalanceLeaves = [];
    for (let i = 0; i < 2**balanceLevels; i++) receiverBalanceLeaves.push(20n + BigInt(i));
    // TODO: check index bounds
    receiverBalanceLeaves[tokenID] = balance2;
    let oldReceiverBalanceProof = getBTreeProof(receiverBalanceLeaves, tokenID);
    receiverBalanceLeaves[tokenID] = balance2 + amount;
    let newReceiverBalanceProof = getBTreeProof(receiverBalanceLeaves, tokenID);
    const oldReceiver = {
      nonce: nonce2,
      sign: account2.sign,
      balanceRoot: oldReceiverBalanceProof.root,
      ay: account2.ay,
      ethAddr: ethAddr2NoPrefix,
    };
    const oldReceiverHash = hashAccountState(oldReceiver);
    const newReceiver = {
      nonce: nonce2,
      sign: account2.sign,
      balanceRoot: newReceiverBalanceProof.root,
      ay: account2.ay,
      ethAddr: ethAddr2NoPrefix,
    };
    const newReceiverHash = hashAccountState(newReceiver);

    // account tree
    let accountLeaves = [];
    for (let i = 0; i < 2**accountLevels; i++) accountLeaves.push(70n + BigInt(i));
    // TODO: check index bounds
    accountLeaves[fromAccountID] = oldSenderHash;
    accountLeaves[toAccountID] = oldReceiverHash;
    let oldAccountProof = getBTreeProof(accountLeaves, fromAccountID);
    accountLeaves[fromAccountID] = newSenderHash;
    let tmpAccountProof = getBTreeProof(accountLeaves, fromAccountID);
    accountLeaves[toAccountID] = newReceiverHash;
    let newAccountProof = getBTreeProof(accountLeaves, toAccountID);

    // TODO: construct tx and compute hash
    let mockTxHash = hash([TxType.Transfer, tokenID, amount]);
    mockTxHash = hash([mockTxHash, fromAccountID, nonce1, balance1]);
    mockTxHash = hash([mockTxHash, toAccountID, nonce2, balance2]);
    let signature = account1.signHash(mockTxHash);

    return {
      enabled: 1,
      fromAccountID: fromAccountID,
      toAccountID: toAccountID,
      amount: amount,
      tokenID: tokenID,
      nonce: nonce,
      sigL2Hash: mockTxHash,
      s: signature.S,
      r8x: signature.R8[0],
      r8y: signature.R8[1],
      nonce1: nonce1,
      sign1: account1.sign,
      balance1: balance1,
      ay1: Scalar.fromString(account1.ay, 16),
      ethAddr1: Scalar.fromString(ethAddr1NoPrefix, 16),
      sender_balance_path_elements: oldSenderBalanceProof.path_elements,
      sender_account_path_elements: oldAccountProof.path_elements,
      nonce2: nonce2,
      sign2: account2.sign,
      balance2: balance2,
      ay2: Scalar.fromString(account2.ay, 16),
      ethAddr2: Scalar.fromString(ethAddr2NoPrefix, 16),
      receiver_balance_path_elements: oldReceiverBalanceProof.path_elements,
      receiver_account_path_elements: newAccountProof.path_elements,
      oldSenderBalanceRoot: oldSenderBalanceProof.root,
      newSenderBalanceRoot: newSenderBalanceProof.root,
      oldReceiverBalanceRoot: oldReceiverBalanceProof.root,
      newReceiverBalanceRoot: newReceiverBalanceProof.root,
      oldAccountRoot: oldAccountProof.root,
      tmpAccountRoot: tmpAccountProof.root,
      newAccountRoot: newAccountProof.root,
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
      sender_balance_path_elements: test_case.sender_balance_path_elements,
      sender_account_path_elements: test_case.sender_account_path_elements,
      nonce2: test_case.nonce2,
      sign2: test_case.sign2,
      balance2: test_case.balance2,
      ay2: test_case.ay2,
      ethAddr2: test_case.ethAddr2,
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
