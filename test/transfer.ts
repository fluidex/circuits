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
    const fromAccountID = 2;
    const account1 = new Account(1);
    const ethAddr1NoPrefix = account1.ethAddr.replace("0x", "");
    const nonce = 51;
    const tokenID = 2;
    const balance1 = 500;
    const amount = 300;

    const toAccountID = 1;
    const account2 = new Account(2);
    const ethAddr2NoPrefix = account2.ethAddr.replace("0x", "");
    const balance2 = 200;

    // balance tree
    let balanceLeaves = [BigInt(10), BigInt(11), BigInt(oldBalance), BigInt(13)];
    let balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = poseidon(balanceMidLevel);

    balanceLeaves[tokenID] = BigInt(oldBalance) + BigInt(loadAmount);
    balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = poseidon(balanceMidLevel);

    // account tree
    const oldAccount = {
      nonce: Scalar.e(nonce),
      sign: Scalar.e(account.sign),
      balanceRoot: oldBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const oldAccountHash = hashAccountState(oldAccount);

    const newAccount = {
      nonce: Scalar.e(nonce),
      sign: Scalar.e(account.sign),
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    let accountLeaves = [BigInt(20), BigInt(21), oldAccountHash, BigInt(23)];
    let accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = poseidon(accountMidLevel);

    accountLeaves[accountID] = newAccountHash;
    accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = poseidon(accountMidLevel);
    
    return {
      fromAccountID: Scalar.e(fromAccountID),
      toAccountID: Scalar.e(toAccountID),
      amount: Scalar.e(amount),
      tokenID: Scalar.e(tokenID),
 // * @input nonce - {Uint40} - nonce signed in the transaction
 // * @input sigL2Hash - {Field} - hash L2 data to sign
 // * @input s - {Field} - eddsa signature field
 // * @input r8x - {Field} - eddsa signature field
 // * @input r8y - {Field} - eddsa signature field
 // * @input nonce1 - {Uint40} - nonce of the sender leaf
 // * @input sign1 - {Bool} - sign of the sender leaf
 // * @input balance1 - {Uint192} - balance of the sender leaf
 // * @input ay1 - {Field} - ay of the sender leaf
 // * @input ethAddr1 - {Uint160} - ethAddr of the sender leaf
 // * @input sender_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the sender leaf
 // * @input sender_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the sender leaf
 // * @input nonce2 - {Uint40} - nonce of the receiver leaf
 // * @input sign2 - {Bool} - sign of the receiver leaf
 // * @input balance2 - {Uint192} - balance of the receiver leaf
 // * @input ay2 - {Field} - ay of the receiver leaf
 // * @input ethAddr2 - {Uint160} - ethAddr of the receiver leaf
 // * @input receiver_balance_path_elements[balanceLevels][1] - {Array(Field)} - siblings balance merkle proof of the receiver leaf
 // * @input receiver_account_path_elements[accountLevels][1] - {Array(Field)} - siblings account merkle proof of the receiver leaf
 // * @input oldSenderBalanceRoot - {Field} - initial sender balance state root
 // * @input newSenderBalanceRoot - {Field} - final sender balance state root
 // * @input oldReceiverBalanceRoot - {Field} - initial receiver balance state root
 // * @input newReceiverBalanceRoot - {Field} - final receiver balance state root
 // * @input oldAccountRoot - {Field} - initial account state root
 // * @input tmpAccountRoot - {Field} - account state root after updating sender balance, before updating receiver balance
 // * @input newAccountRoot - {Field} - final account state root

      // nonce: Scalar.e(nonce),
      // sign: Scalar.e(account.sign),
      // ay: Scalar.fromString(account.ay, 16),
      // balance: Scalar.e(oldBalance),
      // ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      // balance_path_elements: [[balanceLeaves[3]], [balanceMidLevel[0]]],
      // oldBalanceRoot: oldBalanceRoot,
      // newBalanceRoot: newBalanceRoot,
      // account_path_elements: [[accountLeaves[3]], [accountMidLevel[0]]],
      // oldAccountRoot: oldAccountRoot,
      // newAccountRoot: newAccountRoot,
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
