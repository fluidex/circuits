import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = getGenesisOrderRoot();

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, accountLevels);

  const tokenID = 2n;
  const amount = 300n;
  // set sufficient balance to withdraw
  const balance = amount + 1n;
  const nonce = 99n;

  const account = new Account(2);
  const ethAddrNoPrefix = account.ethAddr.replace('0x', '');
  const accountID = state.createNewAccount();

  // set up account initial state
  state.setAccountKey(accountID, account.publicKey);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID, tokenID, balance);
    } else {
      state.setTokenBalance(accountID, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID, nonce);
  state.setAccountOrderRoot(accountID, genesisOrderRoot);

  let withdrawTx = {
    accountID: BigInt(accountID),
    amount: amount,
    tokenID: BigInt(tokenID),
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  let txhash = common.hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = common.accountSign(account, txhash);
  state.Withdraw(withdrawTx);

  let block = state.forge();
  // TODO: assert length
  return {
    enabled: 1,
    accountID: BigInt(accountID),
    amount: amount,
    tokenID: tokenID,
    nonce: nonce,
    sigL2Hash: txhash,
    s: withdrawTx.signature.S,
    r8x: withdrawTx.signature.R8x,
    r8y: withdrawTx.signature.R8y,
    sign: account.sign,
    balance: balance,
    ay: Scalar.fromString(account.ay, 16),
    ethAddr: Scalar.fromString(ethAddrNoPrefix, 16),
    orderRoot: genesisOrderRoot,
    balance_path_elements: block.balance_path_elements[block.balance_path_elements.length-1][0],
    account_path_elements: block.account_path_elements[block.account_path_elements.length-1][0],
    oldAccountRoot: block.oldAccountRoots[block.oldAccountRoots.length-1],
    newAccountRoot: block.newAccountRoots[block.newAccountRoots.length-1],
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
