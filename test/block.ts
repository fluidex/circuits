import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 4;
const balanceLevels = 1;
const accountLevels = 1;

function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  let data = hash([common.TxType.Transfer, tokenID, amount]);
  data = hash([data, from, fromNonce, oldBalanceFrom]);
  data = hash([data, to, toNonce, oldBalanceTo]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let data = hash([common.TxType.Withdraw, tokenID, amount]);
  //console.log([data, accountID, nonce, oldBalance]);
  data = hash([data, accountID, nonce, oldBalance]);
  return data;
}
function accountSign(acc, hash) {
  let sig = acc.signHash(hash);
  return {
    hash: hash,
    S: sig.S,
    R8x: sig.R8[0],
    R8y: sig.R8[1],
  };
}
function initTestCaseNew() {
  let state = new common.GlobalState(balanceLevels, accountLevels);
  const accountID0 = 0n;
  const accountID1 = 1n;
  const account0 = new Account(2);
  const account1 = new Account(1);
  const tokenID = 0n;
  state.addAccount();
  state.addAccount();
  // the first L2 account has pubkey 0x1
  // TODO: change DepositToOld to account0, DepositToNew to account1
  state.setAccountKey(1n, 1);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    if (BigInt(i) == tokenID) {
      state.setTokenBalance(accountID1, tokenID, 300n);
    } else {
      state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
    }
  }
  state.setAccountNonce(accountID1, 99n);

  state.DepositToNew({
    accountID: BigInt(accountID0),
    tokenID: BigInt(tokenID),
    amount: 200n,
    ethAddr: Scalar.fromString(account0.ethAddr, 16),
    sign: BigInt(account0.sign),
    ay: Scalar.fromString(account0.ay, 16),
  });
  state.DepositToOld({
    accountID: BigInt(accountID1),
    tokenID: BigInt(tokenID),
    amount: 100n,
  });
  let transferTx = {
    from: BigInt(accountID1),
    to: BigInt(accountID0),
    tokenID: BigInt(tokenID),
    amount: 50n,
    signature: null,
  };
  let fullTransferTx = state.fillTransferTx(transferTx);
  // user should check fullTransferTx is consistent with transferTx before signing
  let hash = hashTransfer(fullTransferTx);
  transferTx.signature = accountSign(account1, hash);
  state.Transfer(transferTx);
  let withdrawTx = {
    accountID: BigInt(accountID0),
    amount: 150n,
    tokenID: BigInt(tokenID),
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  hash = hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = accountSign(account0, hash);
  state.Withdraw(withdrawTx);
  let block = state.forge();
  return block;
}

function initTestCase() {
  const genesisOrderRoot = getGenesisOrderRoot();

  const tokenID = 0;

  // oldAccount
  const accountID1 = 1;
  const account1 = new Account(1);
  const ethAddr1NoPrefix = account1.ethAddr.replace('0x', '');
  // newAccount
  const accountID0 = 0;
  const account0 = new Account(2);
  const ethAddr2NoPrefix = account0.ethAddr.replace('0x', '');

  // initial account1 state
  let account1BalanceLeaves = [];
  for (let i = 0; i < 2 ** balanceLevels; i++) account1BalanceLeaves.push(10n + BigInt(i));
  // TODO: check index bounds
  account1BalanceLeaves[tokenID] = 300n;
  let account1BalanceProof = common.getBTreeProof(account1BalanceLeaves, tokenID);
  let account1State = {
    nonce: 99,
    sign: account1.sign,
    balanceRoot: account1BalanceProof.root,
    ay: account1.ay,
    ethAddr: ethAddr1NoPrefix,
    orderRoot: genesisOrderRoot,
  };
  let account1Hash = hashAccountState(account1State);

  // initial account0 state
  let account0BalanceLeaves: Array<BigInt> = new Array(2 ** balanceLevels);
  account0BalanceLeaves.fill(0n, 0, 2 ** balanceLevels);
  let account0BalanceProof = common.getBTreeProof(account0BalanceLeaves, tokenID);
  let account0State = {
    nonce: 0,
    sign: 0,
    balanceRoot: account0BalanceProof.root,
    ay: '0',
    ethAddr: '0',
    orderRoot: genesisOrderRoot,
  };
  let account0Hash = hashAccountState(account0State);

  // initial account tree
  let accountLeaves = [];
  for (let i = 0; i < 2 ** accountLevels; i++) accountLeaves.push(20n + BigInt(i));
  // TODO: check index bounds
  accountLeaves[accountID1] = account1Hash;
  accountLeaves[accountID0] = account0Hash;
  let account1Proof = common.getBTreeProof(accountLeaves, accountID1);
  let account0Proof = common.getBTreeProof(accountLeaves, accountID0);

  let txsType = [];
  let encodedTxs = [];
  let balance_path_elements = [];
  let account_path_elements = [];
  let orderRoots = [];
  let oldAccountRoots = [];
  let newAccountRoots = [];

  let encodedTx: Array<BigInt> = new Array(common.TxLength);
  encodedTx.fill(0n, 0, common.TxLength);

  // 1st tx: deposit_to_new
  let amount = 200n;
  txsType.push(common.TxType.DepositToNew);
  encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
  encodedTx[common.TxDetailIdx.Amount] = amount;
  encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID0);
  encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr2NoPrefix, 16);
  encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account0.sign);
  encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account0.ay, 16);
  encodedTxs.push(encodedTx);
  let balance_path_elements_item = new Array(2);
  balance_path_elements_item[0] = account0BalanceProof.path_elements; // whatever
  balance_path_elements_item[1] = account0BalanceProof.path_elements;
  balance_path_elements.push(balance_path_elements_item);
  let account_path_elements_item = new Array(2);
  account_path_elements_item[0] = account0Proof.path_elements; // whatever
  account_path_elements_item[1] = account0Proof.path_elements;
  account_path_elements.push(account_path_elements_item);
  orderRoots.push([genesisOrderRoot, genesisOrderRoot]);
  oldAccountRoots.push(account0Proof.root);
  // execute tx
  account0BalanceLeaves[tokenID] = amount;
  account0BalanceProof = common.getBTreeProof(account0BalanceLeaves, tokenID);
  account0State = {
    nonce: 0,
    sign: account0.sign,
    balanceRoot: account0BalanceProof.root,
    ay: account0.ay,
    ethAddr: ethAddr2NoPrefix,
    orderRoot: genesisOrderRoot,
  };
  account0Hash = hashAccountState(account0State);
  accountLeaves[accountID0] = account0Hash;
  account1Proof = common.getBTreeProof(accountLeaves, accountID1);
  account0Proof = common.getBTreeProof(accountLeaves, accountID0);
  newAccountRoots.push(account0Proof.root);

  // 2nd tx: deposit_to_old
  amount = 100n;
  txsType.push(common.TxType.DepositToOld);
  encodedTx = new Array(common.TxLength);
  encodedTx.fill(0n, 0, common.TxLength);
  encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID1);
  encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
  encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr1NoPrefix, 16);
  encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account1.sign);
  encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account1.ay, 16);
  encodedTx[common.TxDetailIdx.Amount] = amount;
  encodedTx[common.TxDetailIdx.Nonce2] = Scalar.e(account1State.nonce);
  encodedTx[common.TxDetailIdx.Balance2] = Scalar.e(account1BalanceLeaves[tokenID]);
  encodedTxs.push(encodedTx);
  balance_path_elements_item = new Array(2);
  balance_path_elements_item[0] = account1BalanceProof.path_elements; // whatever
  balance_path_elements_item[1] = account1BalanceProof.path_elements;
  balance_path_elements.push(balance_path_elements_item);
  account_path_elements_item = new Array(2);
  account_path_elements_item[0] = account1Proof.path_elements; // whatever
  account_path_elements_item[1] = account1Proof.path_elements;
  account_path_elements.push(account_path_elements_item);
  orderRoots.push([genesisOrderRoot, genesisOrderRoot]);
  oldAccountRoots.push(account1Proof.root);
  // execute tx
  account1BalanceLeaves[tokenID] += amount;
  account1BalanceProof = common.getBTreeProof(account1BalanceLeaves, tokenID);
  account1State.balanceRoot = account1BalanceProof.root;
  account1Hash = hashAccountState(account1State);
  accountLeaves[accountID1] = account1Hash;
  account1Proof = common.getBTreeProof(accountLeaves, accountID1);
  account0Proof = common.getBTreeProof(accountLeaves, accountID0);
  newAccountRoots.push(account1Proof.root);

  // 3rd tx: transfer
  amount = 50n;
  txsType.push(common.TxType.Transfer);
  encodedTx = new Array(common.TxLength);
  encodedTx.fill(0n, 0, common.TxLength);
  encodedTx[common.TxDetailIdx.AccountID1] = Scalar.e(accountID1);
  encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID0);
  encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
  encodedTx[common.TxDetailIdx.Amount] = amount;
  encodedTx[common.TxDetailIdx.Nonce1] = Scalar.e(account1State.nonce);
  encodedTx[common.TxDetailIdx.Nonce2] = Scalar.e(account0State.nonce);
  encodedTx[common.TxDetailIdx.Sign1] = Scalar.e(account1.sign);
  encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account0.sign);
  encodedTx[common.TxDetailIdx.Ay1] = Scalar.fromString(account1.ay, 16);
  encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account0.ay, 16);
  encodedTx[common.TxDetailIdx.EthAddr1] = Scalar.fromString(ethAddr1NoPrefix, 16);
  encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr2NoPrefix, 16);
  encodedTx[common.TxDetailIdx.Balance1] = Scalar.e(account1BalanceLeaves[tokenID]);
  encodedTx[common.TxDetailIdx.Balance2] = Scalar.e(account0BalanceLeaves[tokenID]);
  // TODO: construct tx and compute hash
  let mockTxHashTransfer = hash([common.TxType.Transfer, tokenID, amount]);
  mockTxHashTransfer = hash([mockTxHashTransfer, accountID1, account1State.nonce, account1BalanceLeaves[tokenID]]);
  mockTxHashTransfer = hash([mockTxHashTransfer, accountID0, account0State.nonce, account0BalanceLeaves[tokenID]]);
  let sigTransfer = account1.signHash(mockTxHashTransfer);
  encodedTx[common.TxDetailIdx.SigL2Hash] = mockTxHashTransfer;
  encodedTx[common.TxDetailIdx.S] = sigTransfer.S;
  encodedTx[common.TxDetailIdx.R8x] = sigTransfer.R8[0];
  encodedTx[common.TxDetailIdx.R8y] = sigTransfer.R8[1];
  encodedTxs.push(encodedTx);
  balance_path_elements_item = new Array(2);
  balance_path_elements_item[0] = account1BalanceProof.path_elements;
  balance_path_elements_item[1] = account0BalanceProof.path_elements;
  balance_path_elements.push(balance_path_elements_item);
  account_path_elements_item = new Array(2);
  account_path_elements_item[0] = account1Proof.path_elements;
  orderRoots.push([genesisOrderRoot, genesisOrderRoot]);
  // leave account_path_elements_item[1] to fill later, when calculating temp tree
  oldAccountRoots.push(account1Proof.root);
  // execute tx
  account1BalanceLeaves[tokenID] -= amount;
  account1BalanceProof = common.getBTreeProof(account1BalanceLeaves, tokenID);
  account1State.balanceRoot = account1BalanceProof.root;
  account1State.nonce += 1;
  account1Hash = hashAccountState(account1State);
  accountLeaves[accountID1] = account1Hash;
  // tmp tree
  account0Proof = common.getBTreeProof(accountLeaves, accountID0);
  account_path_elements_item[1] = account0Proof.path_elements;
  account_path_elements.push(account_path_elements_item);
  account0BalanceLeaves[tokenID] = BigInt(account0BalanceLeaves[tokenID]) + amount;
  account0BalanceProof = common.getBTreeProof(account0BalanceLeaves, tokenID);
  account0State.balanceRoot = account0BalanceProof.root;
  account0Hash = hashAccountState(account0State);
  accountLeaves[accountID0] = account0Hash;
  account1Proof = common.getBTreeProof(accountLeaves, accountID1);
  account0Proof = common.getBTreeProof(accountLeaves, accountID0);
  newAccountRoots.push(account0Proof.root);

  // 4st tx: withdraw
  amount = 150n;
  txsType.push(common.TxType.Withdraw);
  encodedTx = new Array(common.TxLength);
  encodedTx.fill(0n, 0, common.TxLength);
  encodedTx[common.TxDetailIdx.AccountID1] = Scalar.e(accountID0);
  encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
  encodedTx[common.TxDetailIdx.Amount] = amount;
  encodedTx[common.TxDetailIdx.Nonce1] = Scalar.e(account0State.nonce);
  encodedTx[common.TxDetailIdx.Sign1] = Scalar.e(account0.sign);
  encodedTx[common.TxDetailIdx.Ay1] = Scalar.fromString(account0.ay, 16);
  encodedTx[common.TxDetailIdx.EthAddr1] = Scalar.fromString(ethAddr2NoPrefix, 16);
  encodedTx[common.TxDetailIdx.Balance1] = Scalar.e(account0BalanceLeaves[tokenID]);
  // TODO: construct tx and compute hash
  let mockTxHashWithdraw = hash([common.TxType.Withdraw, tokenID, amount]);
  mockTxHashWithdraw = hash([mockTxHashWithdraw, accountID0, account0State.nonce, account0BalanceLeaves[tokenID]]);
  let sigWithdraw = account0.signHash(mockTxHashWithdraw);
  encodedTx[common.TxDetailIdx.SigL2Hash] = mockTxHashWithdraw;
  encodedTx[common.TxDetailIdx.S] = sigWithdraw.S;
  encodedTx[common.TxDetailIdx.R8x] = sigWithdraw.R8[0];
  encodedTx[common.TxDetailIdx.R8y] = sigWithdraw.R8[1];
  encodedTxs.push(encodedTx);
  balance_path_elements_item = new Array(2);
  balance_path_elements_item[0] = account0BalanceProof.path_elements;
  balance_path_elements_item[1] = account0BalanceProof.path_elements; // whatever
  balance_path_elements.push(balance_path_elements_item);
  account_path_elements_item = new Array(2);
  account_path_elements_item[0] = account0Proof.path_elements;
  account_path_elements_item[1] = account0Proof.path_elements; // whatever
  account_path_elements.push(account_path_elements_item);
  orderRoots.push([genesisOrderRoot, genesisOrderRoot]);
  oldAccountRoots.push(account0Proof.root);
  // execute tx
  account0BalanceLeaves[tokenID] = BigInt(account0BalanceLeaves[tokenID]) - amount;
  account0BalanceProof = common.getBTreeProof(account0BalanceLeaves, tokenID);
  account0State.balanceRoot = account0BalanceProof.root;
  account0State.nonce += 1;
  account0Hash = hashAccountState(account0State);
  accountLeaves[accountID0] = account0Hash;
  account1Proof = common.getBTreeProof(accountLeaves, accountID1);
  account0Proof = common.getBTreeProof(accountLeaves, accountID0);
  newAccountRoots.push(account0Proof.root);

  return {
    txsType: txsType,
    encodedTxs: encodedTxs,
    balance_path_elements: balance_path_elements,
    account_path_elements: account_path_elements,
    orderRoots: orderRoots,
    oldAccountRoots: oldAccountRoots,
    newAccountRoots: newAccountRoots,
  };
}

let test_case = initTestCaseNew();
class TestBlock implements SimpleTest {
  getInput() {
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balance_path_elements: test_case.balance_path_elements,
      account_path_elements: test_case.account_path_elements,
      orderRoots: test_case.orderRoots,
      oldAccountRoots: test_case.oldAccountRoots,
      newAccountRoots: test_case.newAccountRoots,
    };
    //console.log(JSON.stringify(input, null, 2));
    return input;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestBlock };

if (require.main === module) {
  function prettyPrint(data) {
    let d = ffjavascript.utils.stringifyBigInts(data);
    return JSON.stringify(d, null, 2);
  }
  if (prettyPrint(initTestCase()) != prettyPrint(initTestCaseNew())) {
    throw new Error('not same');
  }
}
