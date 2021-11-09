import { assert } from 'console';
import { Account } from 'fluidex.js';
import { Tree } from './common/binary_merkle_tree';
import { calculateGenesisOrderRoot, emptyOrderHash } from './common/order';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;

import {
  RawTx,
  DepositToNewTx,
  DepositToOldTx,
  WithdrawTx,
  SpotTradeTx,
  TranferTx,
  UpdateL2Key,
  TxLength,
  TxDetailIdx,
  TxType,
} from './common/tx';
import { L2Block } from './common/block';
import { AccountState } from './common/account_state';
import { DA_Hasher } from './common/da_hashing';
import { encodeFloat } from './codec/float';
import { OrderState } from 'fluidex.js';

// TODO:
// 1. how to handle order cancel? it it needed to implement order cancel inside circuits?
// 2. what will happen when num of open orders > 2**orderLevel?
class GlobalState {
  nTx: number;
  balanceLevels: number;
  orderLevels: number;
  accountLevels: number;
  accountTree: Tree<bigint>;
  // idx to balanceTree
  balanceTrees: Map<bigint, Tree<bigint>>;

  // user -> order_id -> order
  orderMap: Map<bigint, Map<bigint, OrderState>>;
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
    options: any = { enable_self_trade: false, verbose: false },
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
    this.bufferedTxs = [];
    this.bufferedBlocks = [];
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
  setAccountL2Addr(accountID: bigint, sign, ay) {
    this.accounts.get(accountID).updateL2Addr(sign, ay);
    this.recalculateFromAccountState(accountID);
  }
  setAccountNonce(accountID, nonce: BigInt) {
    this.accounts.get(accountID).updateNonce(nonce);
    this.recalculateFromAccountState(accountID);
  }
  // this function should only be used in tests for convenience
  setAccountOrderRoot(accountID, orderRoot: bigint) {
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
    let accountHash = accountState.hash();
    return accountHash;
  }
  hasAccount(idx: bigint): boolean {
    return !!this.accounts.get(idx)?.ay;
  }
  getAccount(idx: bigint): AccountState {
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
    this.orderMap.set(accountID, new Map<bigint, OrderState>());
    this.orderIdToPos.set(accountID, new Map<bigint, bigint>());
    this.orderPosToId.set(accountID, new Map<bigint, bigint>());
    this.accountTree.setValue(accountID, this.defaultAccountLeaf);
    this.nextOrderPositions.set(accountID, next_order_id);
    //console.log("add account", accountID);
    return accountID;
  }

  updateOrderState(accountID: bigint, order: OrderState) {
    //console.log('updateOrderState', accountID, order);
    this.orderMap.get(accountID).set(order.orderId, order);
  }
  // find a position range 0..2**n where the slot is either empty or occupied by a close order
  // so we can place the new order here
  updateNextOrderPos(accountID: bigint, startPos: bigint) {
    for (let i = 0; i < 2 ** this.orderLevels; i++) {
      const candidatePos = (startPos + BigInt(i)) % BigInt(2 ** this.orderLevels);
      const order = this.getAccountOrderByOrderPos(accountID, candidatePos);
      if (order.side == null || order.isFilled()) {
        this.nextOrderPositions.set(accountID, candidatePos);
        if (this.options.verbose && order.isFilled()) {
          console.log('replace filled order', accountID, order.orderId, 'at', candidatePos);
        }
        return;
      } else {
        if (this.options.verbose) {
          console.log('updateNextOrderPos', accountID, candidatePos, order);
        }
      }
    }
    throw new Error('cannot find order pos');
    // force replace
    // TODO: replace the order with least orderid?
    //const candidatePos = startPos % BigInt(2 ** this.orderLevels);
    //this.nextOrderPositions.set(accountID, candidatePos);
    //console.log('WARN: cannot replace filled/empty order, force replace an open order', accountID, candidatePos);
  }
  // place an order into the tree, return the placed old state
  placeOrderIntoTree(accountID: bigint, orderID: bigint): OrderState {
    if (!this.hasOrder(accountID, orderID)) {
      throw new Error('invalid order ' + accountID + ' ' + orderID);
    }
    let pos = this.orderIdToPos.get(accountID).get(orderID);
    if (pos == null) {
      // this order_id not in the tree
      pos = this.getNextOrderPosForUser(accountID);

      const oldOrder = this.getAccountOrderByOrderPos(accountID, pos);
      this.updateOrderLeaf(accountID, pos, orderID);
      this.updateNextOrderPos(accountID, pos + 1n);
      if (oldOrder.orderId > orderID) {
        // https://github.com/fluidex/circuits/issues/159
        throw new Error('order tree full');
      }

      if (this.options.verbose) {
        console.log('place order in tree at', pos, 'for account', accountID, 'order', orderID);
      }
      return oldOrder;
    } else {
      // this order_id already in the tree
      const oldOrder = this.getAccountOrderByOrderId(accountID, orderID);
      if (this.options.verbose) {
        if (oldOrder.orderId != orderID) {
          console.log('replace order in tree from', oldOrder.orderId, 'to', orderID);
        }
      }
      return oldOrder;
    }
  }
  // debug only
  setAccountOrder(accountID: bigint, order: OrderState, update: boolean = false) {
    this.updateOrderState(accountID, order);
    //while running, set order should not modify root
    if (update) {
      this.placeOrderIntoTree(accountID, order.orderId);
    }
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
    const orderIDMask = (1 << this.orderLevels) - 1;

    const order: OrderState = this.orderMap.get(accountID).get(orderID);
    //console.log({ order });
    //TODO: for resolve https://github.com/fluidex/circuits/issues/191,
    //we truncate orderId temporary when calcting order's hash,
    //if this resoultion has become permanent we should update the hash()
    //method in fluidex.js
    const keepedInput = order.orderInput;
    const updatedInput = Object.assign({}, order.orderInput);
    updatedInput.orderId = updatedInput.orderId & BigInt(orderIDMask);
    order.orderInput = updatedInput;
    this.orderTrees.get(accountID).setValue(orderPos, order.hash());
    order.orderInput = keepedInput;
    this.orderIdToPos.get(accountID).set(order.orderId, orderPos);
    this.orderPosToId.get(accountID).set(orderPos, order.orderId);
    this.recalculateFromOrderTree(accountID);
  }
  hasOrder(accountID: bigint, orderID: bigint): boolean {
    return this.orderMap.has(accountID) && this.orderMap.get(accountID).has(orderID);
  }
  getAccountOrderByOrderId(accountID: bigint, orderID: bigint): OrderState {
    return this.orderMap.get(accountID).get(orderID);
  }
  getAccountOrderByOrderPos(accountID: bigint, orderPos: bigint): OrderState {
    const orderID = this.orderPosToId.get(accountID).get(orderPos);
    if (orderID == null) {
      // orderPos: empty
      return OrderState.createEmpty();
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
  //ethAddr has been excluded from l2 states
  /*
  getL1Addr(accountID) {
    return this.accounts.get(accountID).ethAddr;
  }
  */
  UpdateL2Key(tx: UpdateL2Key, newAccount: boolean = false) {
    if (this.options.verbose) {
      console.log('UpdateL2Key', tx.accountID);
    }
    //currently a update L2 key tx is carried by a 'dummy' deposit tx: i.e
    //deposit 0 amount into token 0
    let proof = this.stateProof(tx.accountID, 0n);
    let oldBalance = this.getTokenBalance(tx.accountID, 0n);
    let acc = this.accounts.get(tx.accountID);
    if (newAccount) {
      assert(oldBalance === 0n);
      assert(acc.ay === 0n);
      assert(acc.orderRoot === this.defaultOrderRoot);
    }
    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.Amount] = 0n;

    encodedTx[TxDetailIdx.TokenID1] = 0n;
    encodedTx[TxDetailIdx.AccountID1] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance1] = oldBalance;
    encodedTx[TxDetailIdx.Nonce1] = acc.nonce;
    encodedTx[TxDetailIdx.Sign1] = acc.sign;
    encodedTx[TxDetailIdx.Ay1] = acc.ay;

    encodedTx[TxDetailIdx.TokenID2] = 0n;
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance2] = oldBalance;
    encodedTx[TxDetailIdx.Nonce2] = acc.nonce;
    encodedTx[TxDetailIdx.Sign2] = Scalar.e(tx.sign);
    encodedTx[TxDetailIdx.Ay2] = tx.ay;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
    encodedTx[TxDetailIdx.DstIsNew] = 1n;

    let rawTx: RawTx = {
      txType: TxType.Deposit,
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

    this.setAccountL2Addr(tx.accountID, tx.sign, tx.ay);
    rawTx.rootAfter = this.root();
    this.addRawTx(rawTx);
  }
  DepositToNew(tx: DepositToNewTx) {
    if (this.options.verbose) {
      console.log('DepositToNew (being decomposited)', tx.accountID, tx.tokenID, tx.amount);
    }
    //decomposite depositToNew into two tx
    this.UpdateL2Key(tx, true);
    this.DepositToOld(tx);
  }
  DepositToOld(tx: DepositToOldTx) {
    if (this.options.verbose) {
      console.log('DepositToOld', tx.accountID, tx.tokenID, tx.amount);
    }
    assert(this.accounts.get(tx.accountID).ay != 0n, 'DepositToOld');
    let proof = this.stateProof(tx.accountID, tx.tokenID);
    let oldBalance = this.getTokenBalance(tx.accountID, tx.tokenID);
    let nonce = this.accounts.get(tx.accountID).nonce;
    let acc = this.accounts.get(tx.accountID);

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);

    encodedTx[TxDetailIdx.Amount] = encodeFloat(tx.amount);

    encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID1] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance1] = oldBalance;
    encodedTx[TxDetailIdx.Nonce1] = nonce;
    encodedTx[TxDetailIdx.Sign1] = acc.sign;
    encodedTx[TxDetailIdx.Ay1] = acc.ay;

    encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance2] = oldBalance + tx.amount;
    encodedTx[TxDetailIdx.Nonce2] = nonce;
    encodedTx[TxDetailIdx.Sign2] = acc.sign;
    encodedTx[TxDetailIdx.Ay2] = acc.ay;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
    encodedTx[TxDetailIdx.DstIsNew] = 0n;

    let rawTx: RawTx = {
      txType: TxType.Deposit,
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
      signature: null,
    };
    return fullTx;
  }
  fillWithdrawTx(tx: WithdrawTx) {
    let fullTx = {
      accountID: tx.accountID,
      tokenID: tx.tokenID,
      amount: tx.amount,
      signature: null,
      nonce: this.accounts.get(tx.accountID).nonce,
      oldBalance: this.getTokenBalance(tx.accountID, tx.tokenID),
    };
    return fullTx;
  }
  Transfer(tx: TranferTx) {
    assert(this.accounts.get(tx.from).ay != 0n, 'TransferTx: empty fromAccount');
    assert(this.accounts.get(tx.to).ay != 0n, 'Transfer: empty toAccount');
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
    encodedTx[TxDetailIdx.TokenID2] = tx.tokenID;
    encodedTx[TxDetailIdx.Amount] = encodeFloat(tx.amount);
    encodedTx[TxDetailIdx.Nonce1] = fromAccount.nonce;
    encodedTx[TxDetailIdx.Nonce2] = toAccount.nonce;
    encodedTx[TxDetailIdx.Sign1] = fromAccount.sign;
    encodedTx[TxDetailIdx.Sign2] = toAccount.sign;
    encodedTx[TxDetailIdx.Ay1] = fromAccount.ay;
    encodedTx[TxDetailIdx.Ay2] = toAccount.ay;
    encodedTx[TxDetailIdx.Balance1] = fromOldBalance;
    encodedTx[TxDetailIdx.Balance2] = toOldBalance + tx.amount;
    encodedTx[TxDetailIdx.SigL2Hash1] = tx.signature.hash;
    encodedTx[TxDetailIdx.S1] = tx.signature.S;
    encodedTx[TxDetailIdx.R8x1] = tx.signature.R8x;
    encodedTx[TxDetailIdx.R8y1] = tx.signature.R8y;
    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
    encodedTx[TxDetailIdx.EnableSigCheck1] = 1n;
    encodedTx[TxDetailIdx.DstIsNew] = 0n;

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
    assert(this.accounts.get(tx.accountID).ay != 0n, 'Withdraw');
    let proof = this.stateProof(tx.accountID, tx.tokenID);

    let acc = this.accounts.get(tx.accountID);
    let oldBalance = this.getTokenBalance(tx.accountID, tx.tokenID);
    let nonce = acc.nonce;
    assert(oldBalance > tx.amount, 'Withdraw balance');

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);

    encodedTx[TxDetailIdx.Amount] = encodeFloat(tx.amount);

    encodedTx[TxDetailIdx.TokenID1] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID1] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance1] = oldBalance;
    encodedTx[TxDetailIdx.Nonce1] = nonce;
    encodedTx[TxDetailIdx.Sign1] = acc.sign;
    encodedTx[TxDetailIdx.Ay1] = acc.ay;

    encodedTx[TxDetailIdx.TokenID2] = Scalar.e(tx.tokenID);
    encodedTx[TxDetailIdx.AccountID2] = Scalar.e(tx.accountID);
    encodedTx[TxDetailIdx.Balance2] = oldBalance - tx.amount;
    encodedTx[TxDetailIdx.Nonce2] = nonce + 1n;
    encodedTx[TxDetailIdx.Sign2] = acc.sign;
    encodedTx[TxDetailIdx.Ay2] = acc.ay;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
    encodedTx[TxDetailIdx.EnableSigCheck1] = 1n;

    encodedTx[TxDetailIdx.SigL2Hash1] = tx.signature.hash;
    encodedTx[TxDetailIdx.S1] = tx.signature.S;
    encodedTx[TxDetailIdx.R8x1] = tx.signature.R8x;
    encodedTx[TxDetailIdx.R8y1] = tx.signature.R8y;

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

    this.setTokenBalance(tx.accountID, tx.tokenID, oldBalance - tx.amount);
    this.increaseNonce(tx.accountID);

    rawTx.rootAfter = this.root();
    this.addRawTx(rawTx);
  }

  // case1: old order is empty
  // case2: old order is valid old order with different order id, but we will replace it.
  // case3: old order has same order id, we will modify it
  SpotTrade(tx: SpotTradeTx) {
    //assert(this.accounts.get(tx.order1AccountID).ay != 0n, 'SpotTrade account1');
    //assert(this.accounts.get(tx.order2AccountID).ay != 0n, 'SpotTrade account2');
    if (tx.order1AccountID == tx.order2AccountID) {
      throw new Error('self trade not allowed');
    }

    assert(this.hasOrder(tx.order1AccountID, tx.order1Id), 'unknown order1');
    assert(this.hasOrder(tx.order2AccountID, tx.order2Id), 'unknown order2');
    const oldRoot = this.root();

    let account1 = this.accounts.get(tx.order1AccountID);
    let orderRoot0 = account1.orderRoot;
    let account2 = this.accounts.get(tx.order2AccountID);
    let proof_order1_seller = this.stateProof(tx.order1AccountID, tx.tokenID1to2);
    let proof_order2_seller = this.stateProof(tx.order2AccountID, tx.tokenID2to1);

    // order1State is same as oldOrder1InTree when case3
    // not same when case1 and case2
    const order1State: OrderState = this.getAccountOrderByOrderId(tx.order1AccountID, tx.order1Id);
    const order2State: OrderState = this.getAccountOrderByOrderId(tx.order2AccountID, tx.order2Id);
    const oldOrder1InTree: OrderState = this.placeOrderIntoTree(tx.order1AccountID, tx.order1Id);
    const oldOrder2InTree: OrderState = this.placeOrderIntoTree(tx.order2AccountID, tx.order2Id);

    //console.log({ oldOrder1InTree, oldOrder1, oldOrder2InTree, oldOrder2 });

    let order1_pos = this.getOrderPosByID(tx.order1AccountID, tx.order1Id);
    let order2_pos = this.getOrderPosByID(tx.order2AccountID, tx.order2Id);

    // first, generate the tx
    let encodedTx: Array<bigint> = new Array(TxLength);
    encodedTx.fill(0n, 0, TxLength);
    encodedTx[TxDetailIdx.AccountID1] = tx.order1AccountID;
    encodedTx[TxDetailIdx.AccountID2] = tx.order2AccountID;
    encodedTx[TxDetailIdx.Sign1] = account1.sign;
    encodedTx[TxDetailIdx.Sign2] = account2.sign;
    encodedTx[TxDetailIdx.Ay1] = account1.ay;
    encodedTx[TxDetailIdx.Ay2] = account2.ay;
    encodedTx[TxDetailIdx.Nonce1] = account1.nonce;
    encodedTx[TxDetailIdx.Nonce2] = account2.nonce;
    let account1_balance_sell = this.getTokenBalance(tx.order1AccountID, tx.tokenID1to2);
    let account2_balance_buy = this.getTokenBalance(tx.order2AccountID, tx.tokenID1to2);
    let account2_balance_sell = this.getTokenBalance(tx.order2AccountID, tx.tokenID2to1);
    let account1_balance_buy = this.getTokenBalance(tx.order1AccountID, tx.tokenID2to1);
    assert(account1_balance_sell > tx.amount1to2, 'balance_1to2');
    assert(account2_balance_sell > tx.amount2to1, 'balance_2to1');

    encodedTx[TxDetailIdx.S1] = order1State.orderInput.sig.S;
    encodedTx[TxDetailIdx.R8x1] = order1State.orderInput.sig.R8x;
    encodedTx[TxDetailIdx.R8y1] = order1State.orderInput.sig.R8y;
    encodedTx[TxDetailIdx.SigL2Hash1] = order1State.orderInput.sig.hash;
    encodedTx[TxDetailIdx.S2] = order2State.orderInput.sig.S;
    encodedTx[TxDetailIdx.R8x2] = order2State.orderInput.sig.R8x;
    encodedTx[TxDetailIdx.R8y2] = order2State.orderInput.sig.R8y;
    encodedTx[TxDetailIdx.SigL2Hash2] = order2State.orderInput.sig.hash;

    encodedTx[TxDetailIdx.OldOrder1ID] = oldOrder1InTree.orderId;
    encodedTx[TxDetailIdx.OldOrder1TokenSell] = oldOrder1InTree.tokenSell;
    encodedTx[TxDetailIdx.OldOrder1FilledSell] = oldOrder1InTree.filledSell;
    encodedTx[TxDetailIdx.OldOrder1AmountSell] = oldOrder1InTree.totalSell;
    encodedTx[TxDetailIdx.OldOrder1TokenBuy] = oldOrder1InTree.tokenBuy;
    encodedTx[TxDetailIdx.OldOrder1FilledBuy] = oldOrder1InTree.filledBuy;
    encodedTx[TxDetailIdx.OldOrder1AmountBuy] = oldOrder1InTree.totalBuy;

    encodedTx[TxDetailIdx.OldOrder2ID] = oldOrder2InTree.orderId;
    encodedTx[TxDetailIdx.OldOrder2TokenSell] = oldOrder2InTree.tokenSell;
    encodedTx[TxDetailIdx.OldOrder2FilledSell] = oldOrder2InTree.filledSell;
    encodedTx[TxDetailIdx.OldOrder2AmountSell] = oldOrder2InTree.totalSell;
    encodedTx[TxDetailIdx.OldOrder2TokenBuy] = oldOrder2InTree.tokenBuy;
    encodedTx[TxDetailIdx.OldOrder2FilledBuy] = oldOrder2InTree.filledBuy;
    encodedTx[TxDetailIdx.OldOrder2AmountBuy] = oldOrder2InTree.totalBuy;

    encodedTx[TxDetailIdx.Amount1] = tx.amount1to2;
    encodedTx[TxDetailIdx.Amount2] = tx.amount2to1;
    encodedTx[TxDetailIdx.Order1Pos] = order1_pos;
    encodedTx[TxDetailIdx.Order2Pos] = order2_pos;

    encodedTx[TxDetailIdx.Balance1] = account1_balance_sell;
    encodedTx[TxDetailIdx.Balance2] = account2_balance_buy + tx.amount1to2;
    encodedTx[TxDetailIdx.Balance3] = account2_balance_sell;
    encodedTx[TxDetailIdx.Balance4] = account1_balance_buy + tx.amount2to1;

    encodedTx[TxDetailIdx.EnableBalanceCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableBalanceCheck2] = 1n;
    encodedTx[TxDetailIdx.EnableSigCheck1] = 1n;
    encodedTx[TxDetailIdx.EnableSigCheck2] = 1n;

    let rawTx: RawTx = {
      txType: TxType.SpotTrade,
      payload: encodedTx,
      balancePath0: proof_order1_seller.balancePath, // sender old
      balancePath1: null, // receiver new
      balancePath2: proof_order2_seller.balancePath, // receiver old
      balancePath3: null, // sender new
      orderPath0: this.orderTrees.get(tx.order1AccountID).getProof(order1_pos).path_elements,
      orderPath1: this.orderTrees.get(tx.order2AccountID).getProof(order2_pos).path_elements,
      orderRoot0: orderRoot0,
      orderRoot1: null,
      accountPath0: proof_order1_seller.accountPath,
      accountPath1: null,
      rootBefore: oldRoot,
      rootAfter: 0n,
    };

    /// do not update state root
    // account1 after sending, before receiving
    this.balanceTrees.get(tx.order1AccountID).setValue(tx.tokenID1to2, account1_balance_sell - tx.amount1to2);
    // account2 after sending, before receiving
    this.balanceTrees.get(tx.order2AccountID).setValue(tx.tokenID2to1, account2_balance_sell - tx.amount2to1);
    order1State.filledSell += tx.amount1to2;
    order1State.filledBuy += tx.amount2to1;
    this.updateOrderState(tx.order1AccountID, order1State);
    this.updateOrderLeaf(tx.order1AccountID, order1_pos, order1State.orderId);
    // we disabled self-trade
    // TODO: is self trade correctly handled inside circuits?
    //if (this.options.enable_self_trade) {
    //  account1_balance_buy = this.getTokenBalance(tx.order1_accountID, tx.tokenID_2to1);
    //}
    this.setTokenBalance(tx.order1AccountID, tx.tokenID2to1, account1_balance_buy + tx.amount2to1);
    order2State.filledSell += tx.amount2to1;
    order2State.filledBuy += tx.amount1to2;
    this.updateOrderState(tx.order2AccountID, order2State);
    this.updateOrderLeaf(tx.order2AccountID, order2_pos, order2State.orderId);
    //if (this.options.enable_self_trade) {
    //  account2_balance_buy = this.getTokenBalance(tx.order2_accountID, tx.tokenID_1to2);
    //}
    this.setTokenBalance(tx.order2AccountID, tx.tokenID1to2, account2_balance_buy + tx.amount1to2);

    rawTx.balancePath3 = this.balanceTrees.get(tx.order1AccountID).getProof(tx.tokenID2to1).path_elements;
    rawTx.balancePath1 = this.balanceTrees.get(tx.order2AccountID).getProof(tx.tokenID1to2).path_elements;
    rawTx.accountPath1 = this.accountTree.getProof(tx.order2AccountID).path_elements;
    rawTx.orderRoot1 = this.accounts.get(tx.order2AccountID).orderRoot;

    encodedTx[TxDetailIdx.NewOrder1ID] = order1State.orderId;
    encodedTx[TxDetailIdx.NewOrder1TokenSell] = order1State.tokenSell;
    encodedTx[TxDetailIdx.NewOrder1FilledSell] = order1State.filledSell;
    encodedTx[TxDetailIdx.NewOrder1AmountSell] = encodeFloat(order1State.totalSell);
    encodedTx[TxDetailIdx.NewOrder1TokenBuy] = order1State.tokenBuy;
    encodedTx[TxDetailIdx.NewOrder1FilledBuy] = order1State.filledBuy;
    encodedTx[TxDetailIdx.NewOrder1AmountBuy] = encodeFloat(order1State.totalBuy);

    encodedTx[TxDetailIdx.NewOrder2ID] = order2State.orderId;
    encodedTx[TxDetailIdx.NewOrder2TokenSell] = order2State.tokenSell;
    encodedTx[TxDetailIdx.NewOrder2FilledSell] = order2State.filledSell;
    encodedTx[TxDetailIdx.NewOrder2AmountSell] = encodeFloat(order2State.totalSell);
    encodedTx[TxDetailIdx.NewOrder2TokenBuy] = order2State.tokenBuy;
    encodedTx[TxDetailIdx.NewOrder2FilledBuy] = order2State.filledBuy;
    encodedTx[TxDetailIdx.NewOrder2AmountBuy] = encodeFloat(order2State.totalBuy);

    encodedTx[TxDetailIdx.TokenID1] = order1State.tokenSell;
    encodedTx[TxDetailIdx.TokenID2] = order2State.tokenBuy;

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
    let balancePathElements = bufferedTxs.map(tx => [tx.balancePath0, tx.balancePath1, tx.balancePath2, tx.balancePath3]);
    let orderPathElements = bufferedTxs.map(tx => [tx.orderPath0, tx.orderPath1]);
    let orderRoots = bufferedTxs.map(tx => [tx.orderRoot0, tx.orderRoot1]);
    let accountPathElements = bufferedTxs.map(tx => [tx.accountPath0, tx.accountPath1]);
    let oldAccountRoots = bufferedTxs.map(tx => tx.rootBefore);
    let newAccountRoots = bufferedTxs.map(tx => tx.rootAfter);
    //data avaliability
    const hasher = new DA_Hasher(this.balanceLevels, this.orderLevels, this.accountLevels);
    bufferedTxs.forEach(tx => hasher.encodeRawTx(tx));
    const digest = hasher.digestToFF();
    //console.log('block bits', hasher.bits())

    return {
      oldRoot: oldAccountRoots[0],
      newRoot: newAccountRoots[newAccountRoots.length - 1],
      txDataHashHi: digest.Hi,
      txDataHashLo: digest.Lo,
      txsType,
      encodedTxs,
      balancePathElements,
      orderPathElements,
      accountPathElements,
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
