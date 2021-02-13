import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType, getBTreeProof } from './common';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = getGenesisOrderRoot();

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
  let balanceLeaves = [];
  for (let i = 0; i < 2**balanceLevels; i++) balanceLeaves.push(10n + BigInt(i));
  // TODO: check index bounds
  balanceLeaves[tokenID] = balance;
  let oldBalanceProof = getBTreeProof(balanceLeaves, tokenID);
  balanceLeaves[tokenID] = balance - amount;
  let newBalanceProof = getBTreeProof(balanceLeaves, tokenID);
  const oldAccount = {
    nonce: nonce,
    sign: account.sign,
    balanceRoot: oldBalanceProof.root,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
    orderRoot: genesisOrderRoot,
  };
  const oldAccountHash = hashAccountState(oldAccount);
  const newAccount = {
    nonce: nonce + 1,
    sign: account.sign,
    balanceRoot: newBalanceProof.root,
    ay: account.ay,
    ethAddr: ethAddrNoPrefix,
    orderRoot: genesisOrderRoot,
  };
  const newAccountHash = hashAccountState(newAccount);

  // account tree
  let accountLeaves = [];
  for (let i = 0; i < 2**accountLevels; i++) accountLeaves.push(70n + BigInt(i));
  // TODO: check index bounds
  accountLeaves[accountID] = oldAccountHash;
  let oldAccountProof = getBTreeProof(accountLeaves, accountID);
  accountLeaves[accountID] = newAccountHash;
  let newAccountProof = getBTreeProof(accountLeaves, accountID);

  // TODO: construct tx and compute hash
  let mockTxHash = hash([TxType.Withdraw, tokenID, amount]);
  mockTxHash = hash([mockTxHash, accountID, nonce, balance]);
  let signature = account.signHash(mockTxHash);

  return {
    enabled: 1,
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
    orderRoot: oldAccount.orderRoot,
    balance_path_elements: oldBalanceProof.path_elements,
    account_path_elements: oldAccountProof.path_elements,
    oldBalanceRoot: oldBalanceProof.root,
    newBalanceRoot: newBalanceProof.root,
    oldAccountRoot: oldAccountProof.root,
    newAccountRoot: newAccountProof.root,
  };
}

let test_case = initTestCase();
class TestWithdraw implements SimpleTest {
  getInput() {
    return {
      enabled: test_case.enabled,
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
      orderRoot: test_case.orderRoot,
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
