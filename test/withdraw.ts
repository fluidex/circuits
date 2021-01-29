import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType } from './common';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
  // input-level assignments and pre-processings
  const tokenID = 2;
  const amount = 300n;

  const accountID = 1;
  const account = new Account(1);
  const ethAddrNoPrefix = account.ethAddr.replace('0x', '');
  const nonce = 51;
  const balance = 500n;

  // account state
  let balanceLeaves = [10n, 11n, balance, 13n];
  let balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
  let oldBalanceRoot = hash(balanceMidLevel);
  balanceLeaves[tokenID] = balance - amount;
  balanceMidLevel = [hash([balanceLeaves[0], balanceLeaves[1]]), hash([balanceLeaves[2], balanceLeaves[3]])];
  let newBalanceRoot = hash(balanceMidLevel);
  const oldAccount = {
    nonce: nonce,
    sign: account.sign,
    balanceRoot: oldBalanceRoot,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
  };
  const oldAccountHash = hashAccountState(oldAccount);
  const newAccount = {
    nonce: nonce + 1,
    sign: account.sign,
    balanceRoot: newBalanceRoot,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
  };
  const newAccountHash = hashAccountState(newAccount);

  // account tree
  let accountLeaves = [70n, oldAccountHash, 72n, 73n];
  let accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
  let oldAccountRoot = hash(accountMidLevel);
  accountLeaves[accountID] = newAccountHash;
  accountMidLevel = [hash([accountLeaves[0], accountLeaves[1]]), hash([accountLeaves[2], accountLeaves[3]])];
  let newAccountRoot = hash(accountMidLevel);

  // TODO: construct tx and compute hash
  let mockTxHash = hash([TxType.Withdraw, tokenID, amount]);
  mockTxHash = hash([mockTxHash, accountID, nonce, balance]);
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
    oldBalanceRoot: oldBalanceRoot,
    newBalanceRoot: newBalanceRoot,
    oldAccountRoot: oldAccountRoot,
    newAccountRoot: newAccountRoot,
  };
}

let test_case = initTestCase();
class TestWithdraw implements SimpleTest {
  getInput() {
    return {
      accountID: test_case.accountID,
      amount: test_case.amount,
      tokenID: test_case.tokenID,
      nonce: test_case.nonce,
      sigL2Hash: test_case.sigL2Hash,
      s: test_case.s,
      r8x: test_case.r8x,
      r8y: test_case.r8y,
      sign: test_case.sign,
      balance: test_case.balance,
      ay: test_case.ay,
      ethAddr: test_case.ethAddr,
      balance_path_elements: test_case.balance_path_elements,
      account_path_elements: test_case.account_path_elements,
      oldAccountRoot: test_case.oldAccountRoot,
      newAccountRoot: test_case.newAccountRoot,      
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'withdraw.circom'),
      main: `Withdraw(${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestWithdraw };
