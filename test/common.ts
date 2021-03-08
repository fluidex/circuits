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
  PlaceOrder,
  SpotTrade,
  Nop,
}

const TxLength = 32;
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
  TokenID2,
  Amount2,
  Order1ID,
  Order1AmountSell,
  Order1AmountBuy,
  Order1FilledSell,
  Order1FilledBuy,
  Order2ID,
  Order2AmountSell,
  Order2AmountBuy,
  Order2FilledSell,
  Order2FilledBuy,
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

class PlaceOrderTx {
  accountID: bigint;
  tokenID_sell: bigint;
  tokenID_buy: bigint;
  amount_sell: bigint;
  amount_buy: bigint;
}

// TODO: matain many of these in state
class SpotTradeTx {
  order1_accountID: bigint;
  order2_accountID: bigint;
  tokenID_1to2: bigint;
  tokenID_2to1: bigint;
  amount_1to2: bigint;
  amount_2to1: bigint;
  order1_id: bigint;
  order2_id: bigint;
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
  status: number;
  tokenbuy: bigint;
  tokensell: bigint;
  filled_sell: bigint;
  filled_buy: bigint;
  total_sell: bigint;
  total_buy: bigint;
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
  balanceLevels: number;
  orderLevels: number;
  accountLevels: number;
  accountTree: Tree<bigint>;
  // idx to balanceTree
  balanceTrees: Map<bigint, Tree<bigint>>;
  orderTrees: Map<bigint, Tree<bigint>>;
  orderMap: Map<bigint, Map<bigint, Order>>;
  accounts: Map<bigint, AccountState>;
  bufferedTxs: Array<RawTx>;
  defaultBalanceRoot: bigint;
  defaultOrderRoot: bigint;
  defaultAccountLeaf: bigint;
  next_order_ids: Map<bigint, bigint>;
  options: any;
  constructor(balanceLevels, orderLevels, accountLevels, options = { enable_self_trade: false }) {
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
    this.orderMap = new Map();
    this.accounts = new Map(); // map[account_id]acount_state
    this.bufferedTxs = new Array();
    this.next_order_ids = new Map();
    this.options = options;
  }
  root(): bigint {
    return this.accountTree.getRoot();
  }
  setAccountKey(accountID: bigint, publicKey) {
    //console.log('setAccountKey', accountID);
    this.accounts.get(accountID).updatePublicKey(publicKey);
    this.recalculateFromAccountState(accountID);
  }
  setAccountL2Addr(accountID: bigint, sign, ay, ethAddr) {
    this.accounts.get(accountID).updateL2Addr(sign, ay, ethAddr);
    this.recalculateFromAccountState(accountID);
  }
  setAccountNonce(accountID, nonce: BigInt) {
    this.accounts.get(accountID).updateNonce(nonce);
    this.recalculateFromAccountState(accountID);
  }
  // this function should only be used in tests for convenience
  setAccountOrderRoot(accountID, orderRoot: BigInt) {
    this.accounts.get(accountID).updateOrderRoot(orderRoot);
    this.recalculateFromAccountState(accountID);
  }
  increaseNonce(accountID: bigint) {
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
  getNextOrderIdForUser(accountID): bigint {
    return this.next_order_ids.get(accountID);
  }
  createNewAccount({ next_order_id = 0n } = {}): bigint {
    const accountID = BigInt(this.balanceTrees.size);
    let accountState = this.emptyAccount();
    this.accounts.set(accountID, accountState);
    this.balanceTrees.set(accountID, new Tree<bigint>(this.balanceLevels, 0n));
    this.orderTrees.set(accountID, new Tree<bigint>(this.orderLevels, 0n));
    this.orderMap.set(accountID, new Map<bigint, Order>());
    this.accountTree.setValue(accountID, this.defaultAccountLeaf);
    this.next_order_ids.set(accountID, next_order_id);
    //console.log("add account", accountID);
    return accountID;
  }
  createNewOrder(tx): bigint {
    const orderID = this.getNextOrderIdForUser(tx.accountID);
    let order = {
      status: 0, //open
      tokenbuy: tx.tokenID_buy,
      tokensell: tx.tokenID_sell,
      filled_sell: 0n,
      filled_buy: 0n,
      total_sell: tx.amount_sell,
      total_buy: tx.amount_buy,
    };
    this.setAccountOrder(tx.accountID, orderID, order);
    this.next_order_ids.set(tx.accountID, orderID + 1n);
    return orderID;
  }

  recalculateFromAccountState(accountID: bigint) {
    this.accountTree.setValue(accountID, this.accounts.get(accountID).hash());
  }
  recalculateFromBalanceTree(accountID: bigint) {
    this.accounts.get(accountID).balanceRoot = this.balanceTrees.get(accountID).getRoot();
    this.recalculateFromAccountState(accountID);
  }
  recalculateFromOrderTree(accountID: bigint) {
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
    this.orderTrees.get(accountID).setValue(orderID, hashOrderState(order));
    this.orderMap.get(accountID).set(orderID, order);
    this.recalculateFromOrderTree(accountID);
  }
  getAccountOrder(accountID: bigint, orderID: bigint): Order {
    return this.orderMap.get(accountID).get(orderID);
  }

  trivialOrderPathElements() {
    return new Tree<bigint>(this.orderLevels, 0n).getProof(0n).path_elements;
  }

  stateProof(accountID: bigint, tokenID: bigint) {
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
    assert(this.accounts.get(tx.from).ethAddr != 0n, 'TransferTx: empty fromAccount');
    assert(this.accounts.get(tx.to).ethAddr != 0n, 'Transfer: empty toAccount');
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
  PlaceOrder(tx: PlaceOrderTx): bigint {
    // TODO: check order signature
    //assert(this.accounts.get(tx.accountID).ethAddr != 0n, 'PlaceOrder account: accountID' + tx.accountID);

    let account = this.accounts.get(tx.accountID);
    let proof = this.stateProof(tx.accountID, tx.tokenID_sell);

    let rawTx: RawTx = {
      txType: TxType.PlaceOrder,
      payload: null,
      balancePath0: proof.balancePath,
      balancePath1: proof.balancePath,
      balancePath2: proof.balancePath,
      balancePath3: proof.balancePath,
      orderPath0: null,
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: account.orderRoot,
      orderRoot1: null,
      accountPath0: proof.accountPath,
      accountPath1: proof.accountPath,
      rootBefore: this.root(),
      rootAfter: 0n,
    };

    let order_id = this.createNewOrder(tx);

    // fill in the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.Order1ID] = order_id;
    rawTx.payload = encodedTx;
    rawTx.orderPath0 = this.orderTrees.get(tx.accountID).getProof(order_id).path_elements;
    rawTx.orderRoot1 = this.orderTrees.get(tx.accountID).getProof(order_id).root;

    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
    return order_id;
  }
  SpotTrade(tx: SpotTradeTx) {
    //assert(this.accounts.get(tx.order1_accountID).ethAddr != 0n, 'SpotTrade account1');
    //assert(this.accounts.get(tx.order2_accountID).ethAddr != 0n, 'SpotTrade account2');

    let account1 = this.accounts.get(tx.order1_accountID);
    let account2 = this.accounts.get(tx.order2_accountID);
    let proof_order1_seller = this.stateProof(tx.order1_accountID, tx.tokenID_1to2);
    let proof_order2_seller = this.stateProof(tx.order2_accountID, tx.tokenID_2to1);

    const order1 = this.orderMap.get(tx.order1_accountID).get(tx.order1_id);
    const order2 = this.orderMap.get(tx.order2_accountID).get(tx.order2_id);
    let old_order_state = {
      order1_amountsell: order1.total_sell,
      order1_amountbuy: order1.total_buy,
      order1_filledsell: order1.filled_sell,
      order1_filledbuy: order1.filled_buy,

      order2_amountsell: order2.total_sell,
      order2_amountbuy: order2.total_buy,
      order2_filledsell: order2.filled_sell,
      order2_filledbuy: order2.filled_buy,
    };

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.AccountID1] = tx.order1_accountID;
    encodedTx[TxDetailIdx.AccountID2] = tx.order2_accountID;
    encodedTx[TxDetailIdx.EthAddr1] = account1.ethAddr;
    encodedTx[TxDetailIdx.EthAddr2] = account2.ethAddr;
    encodedTx[TxDetailIdx.Sign1] = account1.sign;
    encodedTx[TxDetailIdx.Sign2] = account2.sign;
    encodedTx[TxDetailIdx.Ay1] = account1.ay;
    encodedTx[TxDetailIdx.Ay2] = account2.ay;
    encodedTx[TxDetailIdx.Nonce1] = account1.nonce;
    encodedTx[TxDetailIdx.Nonce2] = account2.nonce;
    let account1_balance_sell = this.getTokenBalance(tx.order1_accountID, tx.tokenID_1to2);
    let account2_balance_buy = this.getTokenBalance(tx.order2_accountID, tx.tokenID_1to2);
    let account2_balance_sell = this.getTokenBalance(tx.order2_accountID, tx.tokenID_2to1);
    let account1_balance_buy = this.getTokenBalance(tx.order1_accountID, tx.tokenID_2to1);
    assert(account1_balance_sell > tx.amount_1to2, 'balance_1to2');
    assert(account2_balance_sell > tx.amount_2to1, 'balance_2to1');
    encodedTx[TxDetailIdx.TokenID] = tx.tokenID_1to2;
    encodedTx[TxDetailIdx.Amount] = tx.amount_1to2;
    encodedTx[TxDetailIdx.Balance1] = account1_balance_sell;
    encodedTx[TxDetailIdx.Balance2] = account2_balance_buy;
    encodedTx[TxDetailIdx.Balance3] = account2_balance_sell;
    encodedTx[TxDetailIdx.Balance4] = account1_balance_buy;
    encodedTx[TxDetailIdx.TokenID2] = tx.tokenID_2to1;
    encodedTx[TxDetailIdx.Amount2] = tx.amount_2to1;
    encodedTx[TxDetailIdx.Order1ID] = tx.order1_id;
    encodedTx[TxDetailIdx.Order1AmountSell] = old_order_state.order1_amountsell;
    encodedTx[TxDetailIdx.Order1AmountBuy] = old_order_state.order1_amountbuy;
    encodedTx[TxDetailIdx.Order1FilledSell] = old_order_state.order1_filledsell;
    encodedTx[TxDetailIdx.Order1FilledBuy] = old_order_state.order1_filledbuy;
    encodedTx[TxDetailIdx.Order2ID] = tx.order2_id;
    encodedTx[TxDetailIdx.Order2AmountSell] = old_order_state.order2_amountsell;
    encodedTx[TxDetailIdx.Order2AmountBuy] = old_order_state.order2_amountbuy;
    encodedTx[TxDetailIdx.Order2FilledSell] = old_order_state.order2_filledsell;
    encodedTx[TxDetailIdx.Order2FilledBuy] = old_order_state.order2_filledbuy;

    let rawTx: RawTx = {
      txType: TxType.SpotTrade,
      payload: encodedTx,
      balancePath0: proof_order1_seller.balancePath,
      balancePath1: null,
      balancePath2: proof_order2_seller.balancePath,
      balancePath3: null,
      orderPath0: this.orderTrees.get(tx.order1_accountID).getProof(tx.order1_id).path_elements,
      orderPath1: this.orderTrees.get(tx.order2_accountID).getProof(tx.order2_id).path_elements,
      orderRoot0: account1.orderRoot, // not really used in the circuit
      orderRoot1: account2.orderRoot, // not really used in the circuit
      accountPath0: proof_order1_seller.accountPath,
      accountPath1: null,
      rootBefore: this.root(),
      rootAfter: 0n,
    };

    /// do not update state root
    // account1 after sending, before receiving
    this.balanceTrees.get(tx.order1_accountID).setValue(tx.tokenID_1to2, account1_balance_sell - tx.amount_1to2);
    rawTx.balancePath3 = this.balanceTrees.get(tx.order1_accountID).getProof(tx.tokenID_2to1).path_elements;
    // account2 after sending, before receiving
    this.balanceTrees.get(tx.order2_accountID).setValue(tx.tokenID_2to1, account2_balance_sell - tx.amount_2to1);
    rawTx.balancePath1 = this.balanceTrees.get(tx.order2_accountID).getProof(tx.tokenID_1to2).path_elements;

    let newOrder1 = {
      status: 0, // open
      tokenbuy: tx.tokenID_2to1,
      tokensell: tx.tokenID_1to2,
      filled_sell: old_order_state.order1_filledsell + tx.amount_1to2,
      filled_buy: old_order_state.order1_filledbuy + tx.amount_2to1,
      total_sell: old_order_state.order1_amountsell,
      total_buy: old_order_state.order1_amountbuy,
    };
    this.setAccountOrder(tx.order1_accountID, tx.order1_id, newOrder1);
    // TODO: self trade is enabled here now. recheck it later
    if (this.options.enable_self_trade) {
      account1_balance_buy = this.getTokenBalance(tx.order1_accountID, tx.tokenID_2to1);
    }
    this.setTokenBalance(tx.order1_accountID, tx.tokenID_2to1, account1_balance_buy + tx.amount_2to1);
    rawTx.accountPath1 = this.accountTree.getProof(tx.order2_accountID).path_elements;

    let newOrder2 = {
      status: 0, // open
      tokenbuy: tx.tokenID_1to2,
      tokensell: tx.tokenID_2to1,
      filled_sell: old_order_state.order2_filledsell + tx.amount_2to1,
      filled_buy: old_order_state.order2_filledbuy + tx.amount_1to2,
      total_sell: old_order_state.order2_amountsell,
      total_buy: old_order_state.order2_amountbuy,
    };
    this.setAccountOrder(tx.order2_accountID, tx.order2_id, newOrder2);
    if (this.options.enable_self_trade) {
      account2_balance_buy = this.getTokenBalance(tx.order2_accountID, tx.tokenID_1to2);
    }
    this.setTokenBalance(tx.order2_accountID, tx.tokenID_1to2, account2_balance_buy + tx.amount_1to2);

    rawTx.rootAfter = this.root();
    this.bufferedTxs.push(rawTx);
  }
  Nop() {
    // assume we already have initialized the account tree and the balance tree
    let trivialProof = this.stateProof(0n, 0n);
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    let rawTx: RawTx = {
      txType: TxType.Nop,
      payload: encodedTx,
      balancePath0: trivialProof.balancePath,
      balancePath1: trivialProof.balancePath,
      balancePath2: trivialProof.balancePath,
      balancePath3: trivialProof.balancePath,
      orderPath0: this.trivialOrderPathElements(),
      orderPath1: this.trivialOrderPathElements(),
      orderRoot0: trivialProof.orderRoot,
      orderRoot1: trivialProof.orderRoot,
      accountPath0: trivialProof.accountPath,
      accountPath1: trivialProof.accountPath,
      rootBefore: this.root(),
      rootAfter: this.root(),
    };
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
