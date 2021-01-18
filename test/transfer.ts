import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestTransfer implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const nonce = 51;
    const tokenID = 2;
    const amount = 300;

    const fromAccountID = 2;
    const account1 = new Account(1);
    const ethAddr1NoPrefix = account1.ethAddr.replace("0x", "");
    const nonce1 = 99;
    const balance1 = 500;

    const toAccountID = 1;
    const account2 = new Account(2);
    const ethAddr2NoPrefix = account2.ethAddr.replace("0x", "");
    const nonce2 = 77;
    const balance2 = 200;

    // sender state
    let senderBalanceLeaves = [BigInt(10), BigInt(11), BigInt(balance1), BigInt(13)];
    let senderBalanceMidLevel = [poseidon([senderBalanceLeaves[0], senderBalanceLeaves[1]]), poseidon([senderBalanceLeaves[2], senderBalanceLeaves[3]])];
    let oldSenderBalanceRoot = poseidon(senderBalanceMidLevel);
    senderBalanceLeaves[tokenID] = BigInt(balance1) - BigInt(amount);
    senderBalanceMidLevel = [poseidon([senderBalanceLeaves[0], senderBalanceLeaves[1]]), poseidon([senderBalanceLeaves[2], senderBalanceLeaves[3]])];
    let newSenderBalanceRoot = poseidon(senderBalanceMidLevel);
    const oldSender = {
      nonce: Scalar.e(nonce1),
      sign: Scalar.e(account1.sign),
      balanceRoot: oldSenderBalanceRoot,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const oldSenderHash = hashAccountState(oldSender);
    const newSender = {
      nonce: Scalar.e(nonce1+1),
      sign: Scalar.e(account1.sign),
      balanceRoot: newSenderBalanceRoot,
      ay: account1.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const newSenderHash = hashAccountState(newSender);

    // receiver state
    let receiverBalanceLeaves = [BigInt(20), BigInt(21), BigInt(balance2), BigInt(23)];
    let receiverBalanceMidLevel = [poseidon([receiverBalanceLeaves[0], receiverBalanceLeaves[1]]), poseidon([receiverBalanceLeaves[2], receiverBalanceLeaves[3]])];
    let oldReceiverBalanceRoot = poseidon(receiverBalanceMidLevel);
    receiverBalanceLeaves[tokenID] = BigInt(balance2) + BigInt(amount);
    receiverBalanceMidLevel = [poseidon([receiverBalanceLeaves[0], receiverBalanceLeaves[1]]), poseidon([receiverBalanceLeaves[2], receiverBalanceLeaves[3]])];
    let newReceiverBalanceRoot = poseidon(receiverBalanceMidLevel);
    const oldReceiver = {
      nonce: Scalar.e(nonce2),
      sign: Scalar.e(account2.sign),
      balanceRoot: oldReceiverBalanceRoot,
      ay: account2.ay,
      ethAddr: ethAddr1NoPrefix,
    };
    const oldReceiverHash = hashAccountState(oldReceiver);
    const newReceiver = {
      nonce: Scalar.e(nonce2),
      sign: Scalar.e(account2.sign),
      balanceRoot: newReceiverBalanceRoot,
      ay: account2.ay,
      ethAddr: ethAddr2NoPrefix,
    };
    const newReceiverHash = hashAccountState(newReceiver);

    // account tree
    let oldAccountLeaves = [BigInt(70), oldReceiverHash, oldSenderHash, BigInt(73)];
    let oldAccountMidLevel = [poseidon([oldAccountLeaves[0], oldAccountLeaves[1]]), poseidon([oldAccountLeaves[2], oldAccountLeaves[3]])];
    let oldAccountRoot = poseidon(oldAccountMidLevel);
    let tmpAccountLeaves = [BigInt(70), oldReceiverHash, newSenderHash, BigInt(73)];
    let tmpAccountMidLevel = [poseidon([tmpAccountLeaves[0], tmpAccountLeaves[1]]), poseidon([tmpAccountLeaves[2], tmpAccountLeaves[3]])];
    let tmpAccountRoot = poseidon(tmpAccountMidLevel);
    let newAccountLeaves = [BigInt(70), newReceiverHash, newSenderHash, BigInt(73)];
    let newAccountMidLevel = [poseidon([newAccountLeaves[0], newAccountLeaves[1]]), poseidon([newAccountLeaves[2], newAccountLeaves[3]])];
    let newAccountRoot = poseidon(newAccountMidLevel);

    let mockTx = [ tokenID,
                  amount,
                  fromAccountID,
                  nonce,
                  balance1,
                  toAccountID,
                  nonce2,
                  balance2,
                  ];
    let txHash = poseidon(mockTx);
    let signature = account1.signHash(txHash);
    
    return {
      fromAccountID: Scalar.e(fromAccountID),
      toAccountID: Scalar.e(toAccountID),
      amount: Scalar.e(amount),
      tokenID: Scalar.e(tokenID),
      nonce: Scalar.e(nonce),
      sigL2Hash: txHash,
      s: signature.s,
      r8x: signature.r8x,
      r8y: signature.r8y,
      nonce1: Scalar.e(nonce1),
      sign1: Scalar.e(account1.sign),
      balance1: Scalar.e(balance1),
      ay1: Scalar.fromString(account1.ay, 16),
      ethAddr1: Scalar.fromString(ethAddr1NoPrefix, 16),
      sender_balance_path_elements: [[senderBalanceLeaves[3]], [senderBalanceMidLevel[0]]],
      sender_account_path_elements: [[oldAccountLeaves[3]], [oldAccountMidLevel[0]]],
      nonce2: Scalar.e(nonce2),
      sign2: Scalar.e(account2.sign),
      balance2: Scalar.e(balance2),
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

/**
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 */

// function verifyTxSig(tx) {
//     try {
//         const h = buildHashSig(tx);

//         const signature = {
//             R8: [Scalar.e(tx.r8x), Scalar.e(tx.r8y)],
//             S: Scalar.e(tx.s)
//         };

//         const pubKey = [Scalar.fromString(tx.fromAx, 16), Scalar.fromString(tx.fromAy, 16)];
//         return eddsa.verifyPoseidon(h, signature, pubKey);
//     } catch (E) {
//         return false;
//     }
// }

// signTx(tx) {
//     const h = txUtils.buildHashSig(tx);

//     const signature = eddsa.signPoseidon(this.rollupPrvKey, h);
//     tx.r8x = signature.R8[0];
//     tx.r8y = signature.R8[1];
//     tx.s = signature.S;
//     tx.fromAx = this.ax;
//     tx.fromAy = this.ay;
// }