import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

enum TxType {
  Transfer,
  Withdraw,
}

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestTransfer implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const nonce = 51;
    const tokenID = 2;
    const amount = 300n;

    const fromAccountID = 2;
    const account1 = new Account(1);
    const ethAddr1NoPrefix = account1.ethAddr.replace("0x", "");
    const nonce1 = 51;
    const balance1 = 500n;

    const toAccountID = 1;
    const account2 = new Account(2);
    const ethAddr2NoPrefix = account2.ethAddr.replace("0x", "");
    const nonce2 = 77;
    const balance2 = 200n;

    // sender state
    let senderBalanceLeaves = [10n, 11n, balance1, 13n];
    let senderBalanceMidLevel = [poseidon([senderBalanceLeaves[0], senderBalanceLeaves[1]]), poseidon([senderBalanceLeaves[2], senderBalanceLeaves[3]])];
    let oldSenderBalanceRoot = poseidon(senderBalanceMidLevel);
    senderBalanceLeaves[tokenID] = balance1 - amount;
    senderBalanceMidLevel = [poseidon([senderBalanceLeaves[0], senderBalanceLeaves[1]]), poseidon([senderBalanceLeaves[2], senderBalanceLeaves[3]])];
    let newSenderBalanceRoot = poseidon(senderBalanceMidLevel);
    const oldSender = {
      nonce: nonce1,
      sign: account1.sign,
      balanceRoot: oldSenderBalanceRoot,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const oldSenderHash = hashAccountState(oldSender);
    const newSender = {
      nonce: nonce1+1,
      sign: account1.sign,
      balanceRoot: newSenderBalanceRoot,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const newSenderHash = hashAccountState(newSender);

    // receiver state
    let receiverBalanceLeaves = [20n, 21n, balance2, 23n];
    let receiverBalanceMidLevel = [poseidon([receiverBalanceLeaves[0], receiverBalanceLeaves[1]]), poseidon([receiverBalanceLeaves[2], receiverBalanceLeaves[3]])];
    let oldReceiverBalanceRoot = poseidon(receiverBalanceMidLevel);
    receiverBalanceLeaves[tokenID] = balance2 + amount;
    receiverBalanceMidLevel = [poseidon([receiverBalanceLeaves[0], receiverBalanceLeaves[1]]), poseidon([receiverBalanceLeaves[2], receiverBalanceLeaves[3]])];
    let newReceiverBalanceRoot = poseidon(receiverBalanceMidLevel);
    const oldReceiver = {
      nonce: nonce2,
      sign: account2.sign,
      balanceRoot: oldReceiverBalanceRoot,
      ay: account2.ay,
      ethAddr: ethAddr2NoPrefix,
    };
    const oldReceiverHash = hashAccountState(oldReceiver);
    const newReceiver = {
      nonce: nonce2,
      sign: account2.sign,
      balanceRoot: newReceiverBalanceRoot,
      ay: account2.ay,
      ethAddr: ethAddr2NoPrefix,
    };
    const newReceiverHash = hashAccountState(newReceiver);

    // account tree
    let oldAccountLeaves = [70n, oldReceiverHash, oldSenderHash, 73n];
    let oldAccountMidLevel = [poseidon([oldAccountLeaves[0], oldAccountLeaves[1]]), poseidon([oldAccountLeaves[2], oldAccountLeaves[3]])];
    let oldAccountRoot = poseidon(oldAccountMidLevel);
    let tmpAccountLeaves = [70n, oldReceiverHash, newSenderHash, 73n];
    let tmpAccountMidLevel = [poseidon([tmpAccountLeaves[0], tmpAccountLeaves[1]]), poseidon([tmpAccountLeaves[2], tmpAccountLeaves[3]])];
    let tmpAccountRoot = poseidon(tmpAccountMidLevel);
    let newAccountLeaves = [70n, newReceiverHash, newSenderHash, 73n];
    let newAccountMidLevel = [poseidon([newAccountLeaves[0], newAccountLeaves[1]]), poseidon([newAccountLeaves[2], newAccountLeaves[3]])];
    let newAccountRoot = poseidon(newAccountMidLevel);

    // TODO: construct tx and compute hash
    let mockTxHash = poseidon([TxType.Transfer, tokenID, amount]);
    mockTxHash = poseidon([mockTxHash, fromAccountID, nonce1, balance1]);
    mockTxHash = poseidon([mockTxHash, toAccountID, nonce2, balance2]);
    let signature = account1.signHash(mockTxHash);
    
    return {
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
      sender_balance_path_elements: [[senderBalanceLeaves[3]], [senderBalanceMidLevel[0]]],
      sender_account_path_elements: [[oldAccountLeaves[3]], [oldAccountMidLevel[0]]],
      nonce2: nonce2,
      sign2: account2.sign,
      balance2: balance2,
      ay2: Scalar.fromString(account2.ay, 16),
      ethAddr2: Scalar.fromString(ethAddr2NoPrefix, 16),
      receiver_balance_path_elements: [[receiverBalanceLeaves[3]], [receiverBalanceMidLevel[0]]],
      receiver_account_path_elements: [[tmpAccountLeaves[0]], [tmpAccountMidLevel[1]]],
      oldSenderBalanceRoot: oldSenderBalanceRoot,
      newSenderBalanceRoot: newSenderBalanceRoot,
      oldReceiverBalanceRoot: oldReceiverBalanceRoot,
      newReceiverBalanceRoot: newReceiverBalanceRoot,
      oldAccountRoot: oldAccountRoot,
      tmpAccountRoot: tmpAccountRoot,
      newAccountRoot: newAccountRoot,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'transfer.circom'),
      main: 'Transfer('+balanceLevels+', '+accountLevels+ ')',
    };
  }
}

export { TestTransfer };
