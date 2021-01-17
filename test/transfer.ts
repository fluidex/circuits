import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

/**
 * @input fromAccountID - {Uint48} - sender account index
 * @input toAccountID - {Uint48} - receiver account index
 * @input amount - {Uint192} - amount to transfer from L2 sender to L2 receiver
 * @input tokenID - {Uint32} - tokenID signed in the transaction
 * @input nonce - {Uint40} - nonce signed in the transaction
 * @input sigL2Hash - {Field} - hash L2 data to sign
 * @input s - {Field} - eddsa signature field
 * @input r8x - {Field} - eddsa signature field
 * @input r8y - {Field} - eddsa signature field
 * @input nonce1 - {Uint40} - nonce of the sender leaf
 * @input sign1 - {Bool} - sign of the sender leaf
 * @input balance1 - {Uint192} - balance of the sender leaf
 * @input ay1 - {Field} - ay of the sender leaf
 * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
 * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
 * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
 * @input nonce2 - {Uint40} - nonce of the receiver leaf
 * @input sign2 - {Bool} - sign of the receiver leaf
 * @input balance2 - {Uint192} - balance of the receiver leaf
 * @input ay2 - {Field} - ay of the receiver leaf
 * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
 * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
 * @input oldSenderBalanceRoot - {Field} - initial sender balance state root
 * @input newSenderBalanceRoot - {Field} - final sender balance state root
 * @input oldReceiverBalanceRoot - {Field} - initial receiver balance state root
 * @input newReceiverBalanceRoot - {Field} - final receiver balance state root
 * @input oldAccountRoot - {Field} - initial account state root
 * @input tmpAccountRoot - {Field} - account state root after updating sender balance, before updating receiver balance
 * @input newAccountRoot - {Field} - final account state root
 */
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
    let receiverBalanceLeaves = [BigInt(50), BigInt(51), BigInt(balance2), BigInt(53)];
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

    // let accountLeaves = [BigInt(20), BigInt(21), oldAccountHash, BigInt(23)];
    // let accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    // let oldAccountRoot = poseidon(accountMidLevel);

    // accountLeaves[accountID] = newAccountHash;
    // accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    // let newAccountRoot = poseidon(accountMidLevel);
    
    return {
      fromAccountID: Scalar.e(fromAccountID),
      toAccountID: Scalar.e(toAccountID),
      amount: Scalar.e(amount),
      tokenID: Scalar.e(tokenID),
      nonce: Scalar.e(nonce),
 // * @input sigL2Hash - {Field} - hash L2 data to sign
 // * @input s - {Field} - eddsa signature field
 // * @input r8x - {Field} - eddsa signature field
 // * @input r8y - {Field} - eddsa signature field
      nonce1: Scalar.e(nonce1),
      sign1: Scalar.e(account1.sign),
      balance1: Scalar.e(balance1),
      ay1: Scalar.fromString(account1.ay, 16),
      ethAddr1: Scalar.fromString(ethAddr1NoPrefix, 16),
      sender_balance_path_elements: [[senderBalanceLeaves[3]], [senderBalanceMidLevel[0]]],
      // sender_account_path_elements: [[senderAccountLeaves[3]], [senderAccountMidLevel[0]]],
      nonce2: Scalar.e(nonce2),
      sign2: Scalar.e(account2.sign),
      balance2: Scalar.e(balance2),
      ay2: Scalar.fromString(account2.ay, 16),
      ethAddr2: Scalar.fromString(ethAddr2NoPrefix, 16),
      receiver_balance_path_elements: [[receiverBalanceLeaves[3]], [receiverBalanceMidLevel[0]]],
      // receiver_account_path_elements: [[senderAccountLeaves[3]], [senderAccountMidLevel[0]]],
      oldSenderBalanceRoot: oldSenderBalanceRoot,
      newSenderBalanceRoot: newSenderBalanceRoot,
      oldReceiverBalanceRoot: oldReceiverBalanceRoot,
      newReceiverBalanceRoot: newReceiverBalanceRoot,
 // * @input oldAccountRoot - {Field} - initial account state root
 // * @input tmpAccountRoot - {Field} - account state root after updating sender balance, before updating receiver balance
 // * @input newAccountRoot - {Field} - final account state root
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
