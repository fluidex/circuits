import { assert } from 'console';
import { hash } from '../helper.ts/hash';
import { Account } from '../helper.ts/account';
import { Tree } from '../helper.ts/binary_merkle_tree';
import { hashAccountState, hashOrderState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  DepositToNew,
  DepositToOld,
  Transfer,
  Withdraw,
}

const TxLength = 35;
enum TxDetailIdx {
  TokenID,
  Amount,
  AccountID1,
  AccountID2,
  EthAddr1,
  EthAddr2,
  Sign1,
  Sign2,
  Ay1,
  Ay2,
  Nonce1,
  Nonce2,
  Balance1,
  Balance2,
  Balance3,
  Balance4,
  SigL2Hash,
  S,
  R8x,
  R8y,

  // only used in spot_trade
  amount2,
  order1_id,
  order1_tokensell,
  order1_amountsell,
  order1_tokenbuy,
  order1_amountbuy,
  order2_id,
  order2_tokensell,
  order2_amountsell,
  order2_tokenbuy,
  order2_amountbuy,
  order1_filledsell,
  order1_filledbuy,
  order2_filledsell,
  order2_filledbuy,
}

class TxSignature {
  hash: bigint;
  S: bigint;
  R8x: bigint;
  R8y: bigint;
}

class DepositToNewTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
  ethAddr: bigint;
  sign: bigint;
  ay: bigint;
}

class DepositToOldTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
}

class TranferTx {
  from: bigint;
  to: bigint;
  tokenID: bigint;
  amount: bigint;
  signature: TxSignature;
}

// WithdrawTx can only withdraw to one's own L1 address
class WithdrawTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
  signature: TxSignature;
}


function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  let data = hash([TxType.Transfer, tokenID, amount]);
  data = hash([data, from, fromNonce, oldBalanceFrom]);
  data = hash([data, to, toNonce, oldBalanceTo]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let data = hash([TxType.Withdraw, tokenID, amount]);
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

class RawTx {
  txType: TxType;
  payload: Array<bigint>;
  balancePath0: Array<bigint>;
  balancePath1: Array<bigint>;
  balancePath2: Array<bigint>;
  balancePath3: Array<bigint>;
  orderPath0: Array<bigint>;
  orderPath1: Array<bigint>;
  orderRoot0: bigint;
  orderRoot1: bigint;
  accountPath0: Array<bigint>;
  accountPath1: Array<bigint>;
  rootBefore: bigint;
  rootAfter: bigint;
}

class Order {
  status: number,
  tokenbuy: bigint,
  tokensell: bigint,
  filled_sell: bigint,
  filled_buy: bigint,
  total_sell: bigint,
  total_buy: bigint,
  hash() {
    return hashOrderState(this);
  }
}

class AccountState {
  nonce: bigint;
  sign: bigint;
  balanceRoot: bigint;
  ay: bigint;
  ethAddr: bigint;
  orderRoot: bigint;
  hash() {
    return hashAccountState(this);
  }
  // TODO: combine with emptyAccount
  constructor() {
    this.nonce = 0n;
    this.sign = 0n;
    this.balanceRoot = 0n;
    this.ay = 0n;
    this.ethAddr = 0n;
    this.orderRoot = 0n;
  }
  updatePublicKey(publicKey) {
    const account = new Account(publicKey);
    const sign = BigInt(account.sign);
    const ay = Scalar.fromString(account.ay, 16);
    const ethAddr = Scalar.fromString(account.ethAddr.replace('0x', ''), 16);
    this.updateL2Addr(sign, ay, ethAddr);
  }
  // TODO: remove ethAddr
  updateL2Addr(sign, ay, ethAddr) {
    this.sign = sign;
    this.ay = ay;
    this.ethAddr = ethAddr;
  }
  updateNonce(nonce) {
    this.nonce = nonce;
  }
  updateOrderRoot(orderRoot) {
    this.orderRoot = orderRoot;
  }
}

class GlobalState {
  orderLevels: number;
  balanceLevels: number;
  accountLevels: number;
  accountTree: Tree<bigint>;
  // idx to balanceTree
  balanceTrees: Map<bigint, Tree<bigint>>;
  orderTrees: Map<bigint, Tree<bigint>>;
  accounts: Map<bigint, AccountState>;
  bufferedTxs: Array<RawTx>;
  defaultBalanceRoot: bigint;
  defaultOrderRoot: bigint;
  defaultAccountLeaf: bigint;
  constructor(orderLevels, balanceLevels, accountLevels) {
    this.balanceLevels = balanceLevels;
    this.orderLevels = orderLevels;
    this.accountLevels = accountLevels;
    this.defaultBalanceRoot = new Tree<bigint>(balanceLevels, 0n).getRoot();
    this.defaultOrderRoot = calculateGenesisOrderRoot(orderLevels); // equivalent to `new Tree<bigint>(orderLevels, 0n).getRoot();`
    // defaultAccountLeaf depends on defaultOrderRoot and defaultBalanceRoot
    this.defaultAccountLeaf = this.hashForEmptyAccount();
    this.accountTree = new Tree<bigint>(accountLevels, this.defaultAccountLeaf); // Tree<account_hash>
    this.balanceTrees = new Map(); // map[account_id]balance_tree
    this.orderTrees = new Map(); // map[account_id]order_tree
    this.accounts = new Map(); // map[account_id]acount_state
    this.bufferedTxs = new Array();
  }
  root(): bigint {
    return this.accountTree.getRoot();
  }
  setAccountKey(accountID, publicKey) {
    //console.log('setAccountKey', accountID);
    this.accounts.get(accountID).updatePublicKey(publicKey);
    this.recalculateFromAccountState(accountID);
  }
  setAccountL2Addr(accountID, sign, ay, ethAddr) {
    this.accounts.get(accountID).updateL2Addr(sign, ay, ethAddr);
    this.recalculateFromAccountState(accountID);
  }
  setAccountNonce(accountID, nonce: BigInt) {
    this.accounts.get(accountID).updateNonce(nonce);
    this.recalculateFromAccountState(accountID);
  }
  // this function should only be used in tests for convenience
  // TODO: maybe we can remove this now?
  setAccountOrderRoot(accountID, orderRoot: BigInt) {
    this.accounts.get(accountID).updateOrderRoot(orderRoot);
    this.recalculateFromAccountState(accountID);
  }
  increaseNonce(accountID) {
    let oldNonce = this.accounts.get(accountID).nonce;
    //console.log('oldNonce', oldNonce);
    this.setAccountNonce(accountID, oldNonce + 1n);
  }
  emptyAccount() {
    let accountState = new AccountState();
    accountState.balanceRoot = this.defaultBalanceRoot;
    accountState.orderRoot = this.defaultOrderRoot;
    return accountState;
  }
  hashForEmptyAccount(): bigint {
    let accountState = this.emptyAccount();
    let accountHash = hashAccountState(accountState);
    return accountHash;
  }
  getAccount(idx): AccountState {
    if (this.accounts.has(idx)) {
      return this.accounts.get(idx);
    } else {
      throw Error('account_id overflow');
    }
  }
  createNewAccount(): bigint {
    const accountID = BigInt(this.balanceTrees.size);
    let accountState = this.emptyAccount();
    this.accounts.set(accountID, accountState);
    this.balanceTrees.set(accountID, new Tree<bigint>(this.balanceLevels, 0n));
    this.orderTrees.set(accountID, new Tree<bigint>(this.orderLevels, 0n));
    this.accountTree.setValue(accountID, this.defaultAccountLeaf);
    //console.log("add account", accountID);
    return accountID;
  }

  recalculateFromAccountState(accountID) {
    this.accountTree.setValue(accountID, this.accounts.get(accountID).hash());
  }
  recalculateFromBalanceTree(accountID) {
    this.accounts.get(accountID).balanceRoot = this.balanceTrees.get(accountID).getRoot();
    this.recalculateFromAccountState(accountID);
  }
  recalculateFromOrderTree(accountID) {
    this.accounts.get(accountID).orderRoot = this.orderTrees.get(accountID).getRoot();
    this.recalculateFromAccountState(accountID);
  }
  getTokenBalance(accountID: bigint, tokenID: bigint): bigint {
    return this.balanceTrees.get(accountID).getLeaf(tokenID);
  }
  setTokenBalance(accountID: bigint, tokenID: bigint, balance: bigint) {
    assert(this.balanceTrees.has(accountID), 'setTokenBalance');
    this.balanceTrees.get(accountID).setValue(tokenID, balance);
    this.recalculateFromBalanceTree(accountID);
  }
  setAccountOrder(accountID: bigint, orderID: bigint, order: Order) {
    assert(this.orderTrees.has(accountID), 'setAccountOrder');
    this.orderTrees.get(accountID).setValue(orderID, order.hash());
    this.recalculateFromOrderTree(accountID);
  }

  trivialOrderPathElements() {
    return new Tree<bigint>(this.orderLevels, 0n).getProof(0n).path_elements;
  }

  stateProof(accountID, tokenID) {
    let { path_elements: balancePath, leaf, root: balanceRoot } = this.balanceTrees.get(accountID).getProof(tokenID);
    let orderRoot = this.orderTrees.get(accountID).getRoot();
    let { path_elements: accountPath, leaf: accountLeaf, root } = this.accountTree.getProof(accountID);
    //assert(accountLeaf == balanceRoot, 'stateProof');
    return {
      leaf,
      root,
      balanceRoot,
      orderRoot,
      balancePath,
      accountPath,
    };
  }
  getL1Addr(accountID) {
    return this.accounts.get(accountID).ethAddr;
  }
  DepositToNew(tx: DepositToNewTx) {
    assert(this.accounts.get(tx.accountID).ethAddr == 0n, 'DepositToNew');
    let proof = this.stateProof(tx.accountID, tx.tokenID);
    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.TokenID] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.Amount] = tx.amount;
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.EthAddr2] = tx.ethAddr;
    encodedTx[TxDetailIdx.Sign2] = Scalar.e(tx.sign);
    encodedTx[TxDetailIdx.Ay2] = tx.ay;
    let rawTx: RawTx = {
      txType: TxType.DepositToNew,
      payload: encodedTx,
      balancePath0: proof.balancePath,
      balancePath1: proof.balancePath,
      balancePath2: proof.balancePath,
      balancePath3: proof.balancePath,
      orderPath0: this.trivialOrderPathElements(),
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: this.defaultOrderRoot,
      orderRoot1: this.defaultOrderRoot,
      accountPath0: proof.accountPath,
      accountPath1: proof.accountPath,
      rootBefore: proof.root,
      rootAfter: 0n,
    };

    // then update global state
    this.setTokenBalance(tx.accountID, tx.tokenID, tx.amount);
    this.setAccountL2Addr(tx.accountID, tx.sign, tx.ay, tx.ethAddr);
    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
  }
  DepositToOld(tx: DepositToOldTx) {
    assert(this.accounts.get(tx.accountID).ethAddr != 0n, 'DepositToOld');
    let proof = this.stateProof(tx.accountID, tx.tokenID);
    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.TokenID] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.Amount] = tx.amount;
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    let oldBalance = this.getTokenBalance(tx.accountID, tx.tokenID);
    //console.log('getTokenBalance', tx.accountID, tx.tokenID, oldBalance);
    encodedTx[TxDetailIdx.Balance2] = oldBalance;
    encodedTx[TxDetailIdx.Nonce2] = this.accounts.get(tx.accountID).nonce;
    let acc = this.accounts.get(tx.accountID);
    encodedTx[TxDetailIdx.EthAddr2] = acc.ethAddr;
    encodedTx[TxDetailIdx.Sign2] = acc.sign;
    encodedTx[TxDetailIdx.Ay2] = acc.ay;

    let rawTx: RawTx = {
      txType: TxType.DepositToOld,
      payload: encodedTx,
      balancePath0: proof.balancePath,
      balancePath1: proof.balancePath,
      balancePath2: proof.balancePath,
      balancePath3: proof.balancePath,
      orderPath0: this.trivialOrderPathElements(),
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: acc.orderRoot,
      orderRoot1: acc.orderRoot,
      accountPath0: proof.accountPath,
      accountPath1: proof.accountPath,
      rootBefore: proof.root,
      rootAfter: 0n,
    };

    this.setTokenBalance(tx.accountID, tx.tokenID, oldBalance + tx.amount);

    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
  }

  fillTransferTx(tx: TranferTx) {
    let fullTx = {
      from: tx.from,
      to: tx.to,
      tokenID: tx.tokenID,
      amount: tx.amount,
      fromNonce: this.accounts.get(tx.from).nonce,
      toNonce: this.accounts.get(tx.to).nonce,
      oldBalanceFrom: this.getTokenBalance(tx.from, tx.tokenID),
      oldBalanceTo: this.getTokenBalance(tx.to, tx.tokenID),
    };
    return fullTx;
  }
  fillWithdrawTx(tx: WithdrawTx) {
    let fullTx = {
      accountID: tx.accountID,
      tokenID: tx.tokenID,
      amount: tx.amount,
      nonce: this.accounts.get(tx.accountID).nonce,
      oldBalance: this.getTokenBalance(tx.accountID, tx.tokenID),
    };
    return fullTx;
  }
  Transfer(tx: TranferTx) {
    let proofFrom = this.stateProof(tx.from, tx.tokenID);
    let fromAccount = this.accounts.get(tx.from);
    let toAccount = this.accounts.get(tx.to);

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);

    let fromOldBalance = this.getTokenBalance(tx.from, tx.tokenID);
    let toOldBalance = this.getTokenBalance(tx.to, tx.tokenID);
    assert(fromOldBalance > tx.amount, 'Transfer balance not enough');
    encodedTx[TxDetailIdx.AccountID1] = tx.from;
    encodedTx[TxDetailIdx.AccountID2] = tx.to;
    encodedTx[TxDetailIdx.TokenID] = tx.tokenID;
    encodedTx[TxDetailIdx.Amount] = tx.amount;
    encodedTx[TxDetailIdx.Nonce1] = fromAccount.nonce;
    encodedTx[TxDetailIdx.Nonce2] = toAccount.nonce;
    encodedTx[TxDetailIdx.Sign1] = fromAccount.sign;
    encodedTx[TxDetailIdx.Sign2] = toAccount.sign;
    encodedTx[TxDetailIdx.Ay1] = fromAccount.ay;
    encodedTx[TxDetailIdx.Ay2] = toAccount.ay;
    encodedTx[TxDetailIdx.EthAddr1] = fromAccount.ethAddr;
    encodedTx[TxDetailIdx.EthAddr2] = toAccount.ethAddr;
    encodedTx[TxDetailIdx.Balance1] = fromOldBalance;
    encodedTx[TxDetailIdx.Balance2] = toOldBalance;
    encodedTx[TxDetailIdx.SigL2Hash] = tx.signature.hash;
    encodedTx[TxDetailIdx.S] = tx.signature.S;
    encodedTx[TxDetailIdx.R8x] = tx.signature.R8x;
    encodedTx[TxDetailIdx.R8y] = tx.signature.R8y;

    let rawTx: RawTx = {
      txType: TxType.Transfer,
      payload: encodedTx,
      balancePath0: proofFrom.balancePath,
      balancePath1: null,
      balancePath2: proofFrom.balancePath,
      balancePath3: null,
      orderPath0: this.trivialOrderPathElements(),
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: fromAccount.orderRoot,
      orderRoot1: toAccount.orderRoot,
      accountPath0: proofFrom.accountPath,
      accountPath1: null,
      rootBefore: proofFrom.root,
      rootAfter: 0n,
    };

    this.setTokenBalance(tx.from, tx.tokenID, fromOldBalance - tx.amount);
    this.increaseNonce(tx.from);

    let proofTo = this.stateProof(tx.to, tx.tokenID);
    rawTx.balancePath1 = proofTo.balancePath;
    rawTx.balancePath3 = proofTo.balancePath;
    rawTx.accountPath1 = proofTo.accountPath;
    this.setTokenBalance(tx.to, tx.tokenID, toOldBalance + tx.amount);

    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
  }
  Withdraw(tx: WithdrawTx) {
    assert(this.accounts.get(tx.accountID).ethAddr != 0n, 'Withdraw');
    let proof = this.stateProof(tx.accountID, tx.tokenID);
    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);

    let acc = this.accounts.get(tx.accountID);
    let balanceBefore = this.getTokenBalance(tx.accountID, tx.tokenID);
    assert(balanceBefore > tx.amount, 'Withdraw balance');
    encodedTx[TxDetailIdx.AccountID1] = tx.accountID;
    encodedTx[TxDetailIdx.TokenID] = tx.tokenID;
    encodedTx[TxDetailIdx.Amount] = tx.amount;
    encodedTx[TxDetailIdx.Nonce1] = acc.nonce;
    encodedTx[TxDetailIdx.Sign1] = acc.sign;
    encodedTx[TxDetailIdx.Ay1] = acc.ay;
    encodedTx[TxDetailIdx.EthAddr1] = acc.ethAddr;
    encodedTx[TxDetailIdx.Balance1] = balanceBefore;

    encodedTx[TxDetailIdx.SigL2Hash] = tx.signature.hash;
    encodedTx[TxDetailIdx.S] = tx.signature.S;
    encodedTx[TxDetailIdx.R8x] = tx.signature.R8x;
    encodedTx[TxDetailIdx.R8y] = tx.signature.R8y;

    let rawTx: RawTx = {
      txType: TxType.Withdraw,
      payload: encodedTx,
      balancePath0: proof.balancePath,
      balancePath1: proof.balancePath,
      balancePath2: proof.balancePath,
      balancePath3: proof.balancePath,
      orderPath0: this.trivialOrderPathElements(),
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: acc.orderRoot,
      orderRoot1: acc.orderRoot,
      accountPath0: proof.accountPath,
      accountPath1: proof.accountPath,
      rootBefore: proof.root,
      rootAfter: 0n,
    };

    this.setTokenBalance(tx.accountID, tx.tokenID, balanceBefore - tx.amount);
    this.increaseNonce(tx.accountID);

    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
  }
  forge() {
    let txsType = this.bufferedTxs.map(tx => tx.txType);
    let encodedTxs = this.bufferedTxs.map(tx => tx.payload);
    let balance_path_elements = this.bufferedTxs.map(tx => [tx.balancePath0, tx.balancePath1, tx.balancePath2, tx.balancePath3]);
    let order_path_elements = this.bufferedTxs.map(tx => [tx.orderPath0, tx.orderPath1]);
    let orderRoots = this.bufferedTxs.map(tx => [tx.orderRoot0, tx.orderRoot1]);
    let account_path_elements = this.bufferedTxs.map(tx => [tx.accountPath0, tx.accountPath1]);
    let oldAccountRoots = this.bufferedTxs.map(tx => tx.rootBefore);
    let newAccountRoots = this.bufferedTxs.map(tx => tx.rootAfter);
    return {
      txsType,
      encodedTxs,
      balance_path_elements,
      order_path_elements,
      account_path_elements,
      orderRoots,
      oldAccountRoots,
      newAccountRoots,
    };
  }
}

export { TxType, TxLength, TxDetailIdx, GlobalState, hashTransfer, hashWithdraw, accountSign };

if (require.main === module) {
  let t = new Tree<bigint>(2, 0n);
  t.fillWithLeaves([1n, 2n, 3n, 4n]);
  t.print(true);
}
