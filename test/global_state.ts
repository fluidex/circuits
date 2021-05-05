import { assert } from 'console';
import { hash } from '../helper.ts/hash';
import { Account } from '../helper.ts/account';
import { Tree } from '../helper.ts/binary_merkle_tree';
import { hashAccountState, hashOrderState, calculateGenesisOrderRoot, emptyOrder, emptyOrderHash } from '../helper.ts/state-utils';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;

import {
  AccountState,
  Order,
  RawTx,
  DepositToNewTx,
  DepositToOldTx,
  WithdrawTx,
  SpotTradeTx,
  PlaceOrderTx,
  TranferTx,
  TxLength,
  TxDetailIdx,
  TxType,
  L2Block,
} from './common';

function shallowClone(o) {
  return Object.assign({}, o);
}

class GlobalState {
  nTx: number;
  balanceLevels: number;
  orderLevels: number;
  accountLevels: number;
  accountTree: Tree<bigint>;
  // idx to balanceTree
  balanceTrees: Map<bigint, Tree<bigint>>;

  // user -> order_id -> order
  orderMap: Map<bigint, Map<bigint, Order>>;
  // user -> order_id -> order_pos
  orderIdToPos: Map<bigint, Map<bigint, bigint>>;
  // user -> order_pos -> order_id
  orderPosToId: Map<bigint, Map<bigint, bigint>>;
  // user -> order_pos -> order_hash
  orderTrees: Map<bigint, Tree<bigint>>;

  accounts: Map<bigint, AccountState>;
  bufferedTxs: Array<RawTx>;
  bufferedBlocks: Array<any>;
  defaultBalanceRoot: bigint;
  defaultOrderLeaf: bigint;
  defaultOrderRoot: bigint;
  defaultAccountLeaf: bigint;
  nextOrderPositions: Map<bigint, bigint>;
  options: any;
  constructor(
    balanceLevels: number,
    orderLevels: number,
    accountLevels: number,
    nTx: number,
    options: object = { enable_self_trade: false, verbose: false },
  ) {
    this.balanceLevels = balanceLevels;
    this.orderLevels = orderLevels;
    this.accountLevels = accountLevels;
    this.defaultBalanceRoot = new Tree<bigint>(balanceLevels, 0n).getRoot();
    this.defaultOrderLeaf = emptyOrderHash;
    this.defaultOrderRoot = calculateGenesisOrderRoot(orderLevels);
    // defaultAccountLeaf depends on defaultOrderRoot and defaultBalanceRoot
    this.defaultAccountLeaf = this.hashForEmptyAccount();
    this.accountTree = new Tree<bigint>(accountLevels, this.defaultAccountLeaf); // Tree<account_hash>
    this.balanceTrees = new Map(); // map[account_id]balance_tree
    this.orderTrees = new Map(); // map[account_id]order_tree
    this.orderMap = new Map();
    this.orderIdToPos = new Map();
    this.orderPosToId = new Map();
    this.accounts = new Map(); // map[account_id]acount_state
    this.bufferedTxs = new Array();
    this.bufferedBlocks = new Array();
    this.nextOrderPositions = new Map();
    this.options = options;
    this.nTx = nTx;
  }
  root(): bigint {
    return this.accountTree.getRoot();
  }
  setAccountKey(accountID: bigint, account: Account) {
    //console.log('setAccountKey', accountID);
    this.accounts.get(accountID).updateAccountKey(account);
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
  getNextOrderPosForUser(accountID): bigint {
    return this.nextOrderPositions.get(accountID);
  }
  createNewAccount({ next_order_id = 0n } = {}): bigint {
    const accountID = BigInt(this.balanceTrees.size);
    if (accountID >= 2 ** this.accountLevels) {
      throw new Error(`account_id ${accountID} overflows for accountLevels ${this.accountLevels}`);
    }

    let accountState = this.emptyAccount();
    this.accounts.set(accountID, accountState);
    this.balanceTrees.set(accountID, new Tree<bigint>(this.balanceLevels, 0n));
    this.orderTrees.set(accountID, new Tree<bigint>(this.orderLevels, this.defaultOrderLeaf));
    this.orderMap.set(accountID, new Map<bigint, Order>());
    this.orderIdToPos.set(accountID, new Map<bigint, bigint>());
    this.orderPosToId.set(accountID, new Map<bigint, bigint>());
    this.accountTree.setValue(accountID, this.defaultAccountLeaf);
    this.nextOrderPositions.set(accountID, next_order_id);
    //console.log("add account", accountID);
    return accountID;
  }

  updateOrderState(accountID: bigint, order: Order) {
    //console.log('updateOrderState', accountID, order);
    this.orderMap.get(accountID).set(order.order_id, order);
  }
  // find a position range 0..2**n where the slot is either empty or occupied by a close order
  // so we can place the new order here
  updateNextOrderPos(accountID: bigint, startPos: bigint) {
    for (let i = 0; i < 2 ** this.orderLevels; i++) {
      const candidatePos = (startPos + BigInt(i)) % BigInt(2 ** this.orderLevels);
      const order = this.getAccountOrderByOrderPos(accountID, candidatePos);
      // TODO: is this correct?
      const isEmptyOrFilled = order.filled_buy >= order.total_buy && order.filled_sell >= order.total_sell;
      if (isEmptyOrFilled) {
        this.nextOrderPositions.set(accountID, candidatePos);
        return;
      }
    }
    throw new Error('cannot find order pos');
  }
  // place an order into the tree, return the placed old state
  placeOrderIntoTree(accountID: bigint, orderID: bigint): Order {
    if (!this.hasOrder(accountID, orderID)) {
      throw new Error('invalid order ' + accountID + ' ' + orderID);
    }
    let pos = this.orderIdToPos.get(accountID).get(orderID);
    if (pos == null) {
      // this order_id not in the tree
      pos = this.getNextOrderPosForUser(accountID);

      const oldOrder = shallowClone(this.getAccountOrderByOrderPos(accountID, pos));
      this.updateOrderLeaf(accountID, pos, orderID);
      this.updateNextOrderPos(accountID, pos + 1n);
      return oldOrder;
    } else {
      // this order_id already in the tree
      const oldOrder = shallowClone(this.getAccountOrderByOrderId(accountID, orderID));
      return oldOrder;
    }
  }
  // debug only
  setAccountOrder(accountID: bigint, order: Order) {
    this.updateOrderState(accountID, order);
    this.placeOrderIntoTree(accountID, order.order_id);
  }
  getOrderPosByID(accountID: bigint, orderID: bigint): bigint {
    const pos = this.orderIdToPos.get(accountID).get(orderID);
    if (pos == null) {
      throw new Error('unknow order id ' + accountID + ' ' + orderID);
    }
    return pos;
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
  // we should never expose 'orderPos' to outside
  // so this function should be private
  private updateOrderLeaf(accountID: bigint, orderPos: bigint, orderID: bigint) {
    assert(this.orderTrees.has(accountID), 'setAccountOrder');
    if (orderPos >= 2 ** this.orderLevels) {
      throw new Error(`orderPos ${orderPos} invalid for orderLevels ${this.orderLevels}`);
    }

    const order = this.orderMap.get(accountID).get(orderID);
    this.orderTrees.get(accountID).setValue(orderPos, hashOrderState(order));
    this.orderIdToPos.get(accountID).set(order.order_id, orderPos);
    this.orderPosToId.get(accountID).set(orderPos, order.order_id);
    this.recalculateFromOrderTree(accountID);
  }
  hasOrder(accountID: bigint, orderID: bigint): boolean {
    return this.orderMap.has(accountID) && this.orderMap.get(accountID).has(orderID);
  }
  getAccountOrderByOrderId(accountID: bigint, orderID: bigint): Order {
    return this.orderMap.get(accountID).get(orderID);
  }
  getAccountOrderByOrderPos(accountID: bigint, orderPos: bigint): Order {
    const orderID = this.orderPosToId.get(accountID).get(orderPos);
    if (orderID == null) {
      // orderPos: empty
      return emptyOrder();
    } else {
      return this.orderMap.get(accountID).get(orderID);
    }
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
    encodedTx[TxDetailIdx.Amount] = tx.amount;

    encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID1] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance1] = 0n;
    encodedTx[TxDetailIdx.Nonce1] = 0n;
    encodedTx[TxDetailIdx.EthAddr1] = 0n;
    encodedTx[TxDetailIdx.Sign1] = 0n;
    encodedTx[TxDetailIdx.Ay1] = 0n;

    encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance2] = tx.amount;
    encodedTx[TxDetailIdx.Nonce2] = 0n;
    encodedTx[TxDetailIdx.EthAddr2] = tx.ethAddr;
    encodedTx[TxDetailIdx.Sign2] = Scalar.e(tx.sign);
    encodedTx[TxDetailIdx.Ay2] = tx.ay;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;

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
    this.addRawTx(rawTx);
  }
  DepositToOld(tx: DepositToOldTx) {
    //assert(this.accounts.get(tx.accountID).ethAddr != 0n, 'DepositToOld');
    let proof = this.stateProof(tx.accountID, tx.tokenID);
    let oldBalance = this.getTokenBalance(tx.accountID, tx.tokenID);
    let nonce = this.accounts.get(tx.accountID).nonce;
    let acc = this.accounts.get(tx.accountID);

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);

    encodedTx[TxDetailIdx.Amount] = tx.amount;

    encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID1] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance1] = oldBalance;
    encodedTx[TxDetailIdx.Nonce1] = nonce;
    encodedTx[TxDetailIdx.EthAddr1] = acc.ethAddr;
    encodedTx[TxDetailIdx.Sign1] = acc.sign;
    encodedTx[TxDetailIdx.Ay1] = acc.ay;

    // TODO: we may disable 'balanceChecker2'?
    encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance2] = oldBalance + tx.amount;
    encodedTx[TxDetailIdx.Nonce2] = nonce;
    encodedTx[TxDetailIdx.EthAddr2] = acc.ethAddr;
    encodedTx[TxDetailIdx.Sign2] = acc.sign;
    encodedTx[TxDetailIdx.Ay2] = acc.ay;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;

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
    this.addRawTx(rawTx);
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

    let fromOldBalance = this.getTokenBalance(tx.from, tx.tokenID);
    let toOldBalance = this.getTokenBalance(tx.to, tx.tokenID);
    assert(fromOldBalance > tx.amount, 'Transfer balance not enough');

    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.AccountID1] = tx.from;
    encodedTx[TxDetailIdx.AccountID2] = tx.to;
    encodedTx[TxDetailIdx.TokenID1] = tx.tokenID;
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

    this.setTokenBalance(tx.from, tx.tokenID, fromOldBalance - tx.amount);
    this.increaseNonce(tx.from);

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

    let proofTo = this.stateProof(tx.to, tx.tokenID);
    rawTx.balancePath1 = proofTo.balancePath;
    rawTx.balancePath3 = proofTo.balancePath;
    rawTx.accountPath1 = proofTo.accountPath;
    this.setTokenBalance(tx.to, tx.tokenID, toOldBalance + tx.amount);

    rawTx.rootAfter = this.root();
    this.addRawTx(rawTx);
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
    encodedTx[TxDetailIdx.TokenID1] = tx.tokenID;
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
    this.addRawTx(rawTx);
  }
  /*
  // PlaceOrder not create L2 tx now
  PlaceOrder(tx: PlaceOrderTx): bigint {
    if (this.options.verbose) {
      console.log('PlaceOrder', tx);
    }
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
    
    //console.log("orderRoo0", rawTx.orderRoot0);
    let order_pos = this.createNewOrder(tx);

    
    // fill in the tx
    let txData = new PlaceOrderTxData();

    txData.order_pos = order_pos;
    txData.old_order_id = 0n;
    txData.new_order_id = tx.orderID;
    txData.old_order_tokensell = tx.previous_tokenID_sell;
    txData.old_order_filledsell = tx.previous_filled_sell;
    txData.old_order_amountsell = tx.previous_amount_sell;
    txData.old_order_tokenbuy = tx.previous_tokenID_buy;
    txData.old_order_filledbuy = tx.previous_filled_buy;
    txData.old_order_amountbuy = tx.previous_amount_buy;
    txData.new_order_tokensell = tx.tokenID_sell;
    txData.new_order_amountsell = tx.amount_sell;
    txData.new_order_tokenbuy = tx.tokenID_buy;
    txData.new_order_amountbuy = tx.amount_buy;
    txData.accountID = tx.accountID;
    txData.balance = proof.leaf;
    txData.nonce = account.nonce;
    txData.sign = account.sign;
    txData.ay = account.ay;
    txData.ethAddr = account.ethAddr;

    let encodedTx = txData.encode();

    rawTx.payload = encodedTx;
    rawTx.orderPath0 = this.orderTrees.get(tx.accountID).getProof(order_pos).path_elements;
    //console.log('rawTx.orderPath0', rawTx.orderPath0)
    rawTx.orderRoot1 = this.orderTrees.get(tx.accountID).getProof(order_pos).root;

    rawTx.rootAfter = this.root();
    this.addRawTx(rawTx);
    if (this.options.verbose) {
      //console.log('create order ', order_id, tx);
    }
    
    return order_pos;
  }
  */

  // case1: old order is empty
  // case2: old order is valid old order with different order id, but we will replace it.
  // case3: old order has same order id, we will modify it
  SpotTrade(tx: SpotTradeTx) {
    //assert(this.accounts.get(tx.order1_accountID).ethAddr != 0n, 'SpotTrade account1');
    //assert(this.accounts.get(tx.order2_accountID).ethAddr != 0n, 'SpotTrade account2');

    assert(this.hasOrder(tx.order1_accountID, tx.order1_id), 'unknown order1');
    assert(this.hasOrder(tx.order2_accountID, tx.order2_id), 'unknown order2');
    const oldRoot = this.root();

    let account1 = this.accounts.get(tx.order1_accountID);
    let account2 = this.accounts.get(tx.order2_accountID);
    let proof_order1_seller = this.stateProof(tx.order1_accountID, tx.tokenID_1to2);
    let proof_order2_seller = this.stateProof(tx.order2_accountID, tx.tokenID_2to1);

    // oldOrder1 is same as oldOrder1InTree when case3
    // not same when case1 and case2
    const oldOrder1: Order = shallowClone(this.getAccountOrderByOrderId(tx.order1_accountID, tx.order1_id));
    const oldOrder2: Order = shallowClone(this.getAccountOrderByOrderId(tx.order2_accountID, tx.order2_id));
    const oldOrder1InTree: Order = this.placeOrderIntoTree(tx.order1_accountID, tx.order1_id);
    const oldOrder2InTree: Order = this.placeOrderIntoTree(tx.order2_accountID, tx.order2_id);

    //console.log({ oldOrder1InTree, oldOrder1, oldOrder2InTree, oldOrder2 });

    let order1_pos = this.getOrderPosByID(tx.order1_accountID, tx.order1_id);
    let order2_pos = this.getOrderPosByID(tx.order2_accountID, tx.order2_id);

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

    encodedTx[TxDetailIdx.OldOrder1ID] = oldOrder1InTree.order_id;
    encodedTx[TxDetailIdx.OldOrder1TokenSell] = oldOrder1InTree.tokensell;
    encodedTx[TxDetailIdx.OldOrder1FilledSell] = oldOrder1InTree.filled_sell;
    encodedTx[TxDetailIdx.OldOrder1AmountSell] = oldOrder1InTree.total_sell;
    encodedTx[TxDetailIdx.OldOrder1TokenBuy] = oldOrder1InTree.tokenbuy;
    encodedTx[TxDetailIdx.OldOrder1FilledBuy] = oldOrder1InTree.filled_buy;
    encodedTx[TxDetailIdx.OldOrder1AmountBuy] = oldOrder1InTree.total_buy;

    encodedTx[TxDetailIdx.OldOrder2ID] = oldOrder2InTree.order_id;
    encodedTx[TxDetailIdx.OldOrder2TokenSell] = oldOrder2InTree.tokensell;
    encodedTx[TxDetailIdx.OldOrder2FilledSell] = oldOrder2InTree.filled_sell;
    encodedTx[TxDetailIdx.OldOrder2AmountSell] = oldOrder2InTree.total_sell;
    encodedTx[TxDetailIdx.OldOrder2TokenBuy] = oldOrder2InTree.tokenbuy;
    encodedTx[TxDetailIdx.OldOrder2FilledBuy] = oldOrder2InTree.filled_buy;
    encodedTx[TxDetailIdx.OldOrder2AmountBuy] = oldOrder2InTree.total_buy;

    encodedTx[TxDetailIdx.Amount] = tx.amount_1to2;
    encodedTx[TxDetailIdx.Amount2] = tx.amount_2to1;
    encodedTx[TxDetailIdx.Order1Pos] = order1_pos;
    encodedTx[TxDetailIdx.Order2Pos] = order2_pos;

    encodedTx[TxDetailIdx.Balance1] = account1_balance_sell;
    encodedTx[TxDetailIdx.Balance2] = account2_balance_buy;
    encodedTx[TxDetailIdx.Balance3] = account2_balance_sell;
    encodedTx[TxDetailIdx.Balance4] = account1_balance_buy;

    let rawTx: RawTx = {
      txType: TxType.SpotTrade,
      payload: encodedTx,
      balancePath0: proof_order1_seller.balancePath,
      balancePath1: null,
      balancePath2: proof_order2_seller.balancePath,
      balancePath3: null,
      orderPath0: this.orderTrees.get(tx.order1_accountID).getProof(order1_pos).path_elements,
      orderPath1: this.orderTrees.get(tx.order2_accountID).getProof(order2_pos).path_elements,
      orderRoot0: account1.orderRoot, // not really used in the circuit
      orderRoot1: account2.orderRoot, // not really used in the circuit
      accountPath0: proof_order1_seller.accountPath,
      accountPath1: null,
      rootBefore: oldRoot,
      rootAfter: 0n,
    };

    /// do not update state root
    // account1 after sending, before receiving
    this.balanceTrees.get(tx.order1_accountID).setValue(tx.tokenID_1to2, account1_balance_sell - tx.amount_1to2);
    rawTx.balancePath3 = this.balanceTrees.get(tx.order1_accountID).getProof(tx.tokenID_2to1).path_elements;
    // account2 after sending, before receiving
    this.balanceTrees.get(tx.order2_accountID).setValue(tx.tokenID_2to1, account2_balance_sell - tx.amount_2to1);
    rawTx.balancePath1 = this.balanceTrees.get(tx.order2_accountID).getProof(tx.tokenID_1to2).path_elements;

    let newOrder1: Order = {
      order_id: tx.order1_id,
      tokenbuy: tx.tokenID_2to1,
      tokensell: tx.tokenID_1to2,
      filled_sell: oldOrder1.filled_sell + tx.amount_1to2,
      filled_buy: oldOrder1.filled_buy + tx.amount_2to1,
      total_sell: oldOrder1.total_sell,
      total_buy: oldOrder1.total_buy,
    };
    this.updateOrderState(tx.order1_accountID, newOrder1);
    this.updateOrderLeaf(tx.order1_accountID, order1_pos, newOrder1.order_id);
    // we disabled self-trade
    // TODO: is self trade correctly handled inside circuits?
    //if (this.options.enable_self_trade) {
    //  account1_balance_buy = this.getTokenBalance(tx.order1_accountID, tx.tokenID_2to1);
    //}
    this.setTokenBalance(tx.order1_accountID, tx.tokenID_2to1, account1_balance_buy + tx.amount_2to1);
    rawTx.accountPath1 = this.accountTree.getProof(tx.order2_accountID).path_elements;

    let newOrder2: Order = {
      order_id: tx.order2_id,
      tokenbuy: tx.tokenID_1to2,
      tokensell: tx.tokenID_2to1,
      filled_sell: oldOrder2.filled_sell + tx.amount_2to1,
      filled_buy: oldOrder2.filled_buy + tx.amount_1to2,
      total_sell: oldOrder2.total_sell,
      total_buy: oldOrder2.total_buy,
    };
    this.updateOrderState(tx.order2_accountID, newOrder2);
    this.updateOrderLeaf(tx.order2_accountID, order2_pos, newOrder2.order_id);
    //if (this.options.enable_self_trade) {
    //  account2_balance_buy = this.getTokenBalance(tx.order2_accountID, tx.tokenID_1to2);
    //}
    this.setTokenBalance(tx.order2_accountID, tx.tokenID_1to2, account2_balance_buy + tx.amount_1to2);

    encodedTx[TxDetailIdx.NewOrder1ID] = newOrder1.order_id;
    encodedTx[TxDetailIdx.NewOrder1TokenSell] = newOrder1.tokensell;
    encodedTx[TxDetailIdx.NewOrder1FilledSell] = newOrder1.filled_sell;
    encodedTx[TxDetailIdx.NewOrder1AmountSell] = newOrder1.total_sell;
    encodedTx[TxDetailIdx.NewOrder1TokenBuy] = newOrder1.tokenbuy;
    encodedTx[TxDetailIdx.NewOrder1FilledBuy] = newOrder1.filled_buy;
    encodedTx[TxDetailIdx.NewOrder1AmountBuy] = newOrder1.total_buy;

    encodedTx[TxDetailIdx.NewOrder2ID] = newOrder2.order_id;
    encodedTx[TxDetailIdx.NewOrder2TokenSell] = newOrder2.tokensell;
    encodedTx[TxDetailIdx.NewOrder2FilledSell] = newOrder2.filled_sell;
    encodedTx[TxDetailIdx.NewOrder2AmountSell] = newOrder2.total_sell;
    encodedTx[TxDetailIdx.NewOrder2TokenBuy] = newOrder2.tokenbuy;
    encodedTx[TxDetailIdx.NewOrder2FilledBuy] = newOrder2.filled_buy;
    encodedTx[TxDetailIdx.NewOrder2AmountBuy] = newOrder2.total_buy;

    rawTx.rootAfter = this.root();
    this.addRawTx(rawTx);
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
    this.addRawTx(rawTx);
  }
  addRawTx(rawTx) {
    this.bufferedTxs.push(rawTx);
    if (this.bufferedTxs.length % this.nTx == 0) {
      // forge next block, using last nTx txs
      const txs = this.bufferedTxs.slice(this.bufferedTxs.length - this.nTx);
      const block = this.forgeWithTxs(txs);
      this.bufferedBlocks.push(block);
      assert(this.bufferedBlocks.length * this.nTx == this.bufferedTxs.length, 'invalid block num');
      if (this.options.verbose) {
        console.log('forge block ', this.bufferedBlocks.length - 1, 'done');
        //console.log('txs', txs);
      }
    }
  }
  forgeWithTxs(bufferedTxs: Array<any>): L2Block {
    assert(bufferedTxs.length == this.nTx, 'invalid txs len');
    let txsType = bufferedTxs.map(tx => tx.txType);
    let encodedTxs = bufferedTxs.map(tx => tx.payload);
    let balance_path_elements = bufferedTxs.map(tx => [tx.balancePath0, tx.balancePath1, tx.balancePath2, tx.balancePath3]);
    let order_path_elements = bufferedTxs.map(tx => [tx.orderPath0, tx.orderPath1]);
    let orderRoots = bufferedTxs.map(tx => [tx.orderRoot0, tx.orderRoot1]);
    let account_path_elements = bufferedTxs.map(tx => [tx.accountPath0, tx.accountPath1]);
    let oldAccountRoots = bufferedTxs.map(tx => tx.rootBefore);
    let newAccountRoots = bufferedTxs.map(tx => tx.rootAfter);
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
  forge(autoPad = true): L2Block {
    if (autoPad) {
      this.flushWithNop();
    }
    return this.forgeWithTxs(this.bufferedTxs);
  }
  flushWithNop() {
    while (this.bufferedTxs.length % this.nTx != 0) {
      this.Nop();
    }
  }
  forgeAllL2Blocks(): Array<L2Block> {
    this.flushWithNop();
    return this.bufferedBlocks;
  }
}

export { TxType, TxLength, TxDetailIdx, GlobalState };
