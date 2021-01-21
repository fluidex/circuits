import * as path from 'path';
import { poseidon } from 'circomlib';
import { Scalar } from 'ffjavascript';
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

class TestWithdraw implements SimpleTest {
  getInput() {
    // input-level assignments and pre-processings
    const tokenID = 2;
    const amount = 300n;

    const accountID = 1;
    const account = new Account(1);
    const ethAddrNoPrefix = account.ethAddr.replace("0x", "");
    const nonce = 51;
    const balance = 500n;

    const oldExitTotal = 700n;

    // account state
    let balanceLeaves = [10n, 11n, balance, 13n];
    let balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let oldBalanceRoot = poseidon(balanceMidLevel);
    balanceLeaves[tokenID] = balance - amount;
    balanceMidLevel = [poseidon([balanceLeaves[0], balanceLeaves[1]]), poseidon([balanceLeaves[2], balanceLeaves[3]])];
    let newBalanceRoot = poseidon(balanceMidLevel);
    const oldAccount = {
      nonce: nonce,
      sign: account.sign,
      balanceRoot: oldBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const oldAccountHash = hashAccountState(oldAccount);
    const newAccount = {
      nonce: nonce+1,
      sign: account.sign,
      balanceRoot: newBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newAccountHash = hashAccountState(newAccount);

    // exit state
    let exitBalanceLeaves = [0n, 21n, oldExitTotal, 0n];
    let exitBalanceMidLevel = [poseidon([exitBalanceLeaves[0], exitBalanceLeaves[1]]), poseidon([exitBalanceLeaves[2], exitBalanceLeaves[3]])];
    let oldExitBalanceRoot = poseidon(exitBalanceMidLevel);
    exitBalanceLeaves[tokenID] = oldExitTotal + amount;
    exitBalanceMidLevel = [poseidon([exitBalanceLeaves[0], exitBalanceLeaves[1]]), poseidon([exitBalanceLeaves[2], exitBalanceLeaves[3]])];
    let newExitBalanceRoot = poseidon(exitBalanceMidLevel);
    const oldExitAccount = {
      nonce: 0,
      sign: account.sign,
      balanceRoot: oldExitBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const oldExitAccountHash = hashAccountState(oldExitAccount);
    const newExitAccount = {
      nonce: 0,
      sign: account.sign,
      balanceRoot: newExitBalanceRoot,
      ay: account.ay,
      ethAddr: ethAddrNoPrefix,
    };
    const newExitAccountHash = hashAccountState(newExitAccount);

    // account tree
    let accountLeaves = [70n, oldAccountHash, 72n, 73n];
    let accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let oldAccountRoot = poseidon(accountMidLevel);
    accountLeaves[accountID] = newAccountHash;
    accountMidLevel = [poseidon([accountLeaves[0], accountLeaves[1]]), poseidon([accountLeaves[2], accountLeaves[3]])];
    let newAccountRoot = poseidon(accountMidLevel);
    
    // exit tree
    let exitLeaves = [80n, oldExitAccountHash, 82n, 83n];
    let exitMidLevel = [poseidon([exitLeaves[0], exitLeaves[1]]), poseidon([exitLeaves[2], exitLeaves[3]])];
    let oldExitRoot = poseidon(exitMidLevel);
    exitLeaves[accountID] = newExitAccountHash;
    exitMidLevel = [poseidon([exitLeaves[0], exitLeaves[1]]), poseidon([exitLeaves[2], exitLeaves[3]])];
    let newExitRoot = poseidon(exitMidLevel);

    // TODO: construct tx and compute hash
    let mockTxHash = poseidon([ tokenID, amount]);
    mockTxHash = poseidon([mockTxHash, accountID, nonce, balance]);
    let signature = account.signHash(mockTxHash);
    
    return {
      accountID: accountID,
      amount: amount,
      tokenID: tokenID,
      nonce: nonce,
      sigL2Hash: mockTxHash,
      s: signature.S,
      r8x: signature.R8[0],
      r8y: signature.R8[1],
      sign: account.sign,
      balance: balance,
      ay: Scalar.fromString(account.ay, 16),
      ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
      balance_path_elements: [[balanceLeaves[3]], [balanceMidLevel[0]]],
      account_path_elements: [[accountLeaves[0]], [accountMidLevel[1]]],
      oldExitTotal: oldExitTotal,
      exit_balance_path_elements: [[exitBalanceLeaves[3]], [exitBalanceMidLevel[0]]],
      exit_account_path_elements: [[exitLeaves[0]], [exitMidLevel[1]]],
      oldBalanceRoot: oldBalanceRoot,
      newBalanceRoot: newBalanceRoot,
      oldExitBalanceRoot: oldExitBalanceRoot,
      newExitBalanceRoot: newExitBalanceRoot,
      oldAccountRoot: oldAccountRoot,
      newAccountRoot: newAccountRoot,
      oldExitRoot: oldExitRoot,
      newExitRoot: newExitRoot,
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'withdraw.circom'),
      main: 'Withdraw('+balanceLevels+', '+accountLevels+ ')',
    };
  }
}

export { TestWithdraw };
