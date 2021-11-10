import { GlobalState } from './global_state';
import * as snarkit from 'snarkit';
import { circuitSrcToName } from './common/circuit';
import { hashWithdraw, hashTransfer, hashOrderInput } from './common/tx';
import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
const printf = require('printf');
import { inspect } from 'util';
import { Account } from 'fluidex.js';
import { OrderState, OrderInput, OrderSide } from 'fluidex.js';
import { babyJub } from 'circomlib';
//import { utils as ffutils } from 'ffjavascript';
const ffjavascript = require('ffjavascript');
const ffutils = ffjavascript.utils;
inspect.defaultOptions.depth = null;

const verbose = false;

function getTokenId(tokenName) {
  return { ETH: 0n, USDT: 1n, UNI: 2n, LINK: 3n, YFI: 4n, MATIC: 5n }[tokenName];
}

function getTokenPrec(tokenName) {
  return { ETH: 4, USDT: 6, UNI: 4, LINK: 4, YFI: 4, MATIC: 4 }[tokenName];
}

function convertNumberForToken(num, tokenName) {
  return (num * 10 ** getTokenPrec(tokenName)).toFixed();
}

function getBaseAndQuoteOfTrade(trade): [string, string] {
  return trade.market.split('_');
}

function checkEqByKeys(obj1, obj2, keys = null) {
  for (let k of keys || Object.keys(obj1)) {
    if (obj1[k] != obj2[k]) {
      console.log('not equal', obj1, obj2);
      throw new Error('check equal failed');
    }
  }
}

//patch new state to old form
function compatibleBalance(originalState) {
  if (originalState.balance_states) {
    originalState.balance = {
      ask_user_base: originalState.balance_states[0].balance,
      ask_user_quote: originalState.balance_states[1].balance,
      bid_user_base: originalState.balance_states[2].balance,
      bid_user_quote: originalState.balance_states[3].balance,
    };
  }
}

function parseBalance(originalBalance, [baseToken, quoteToken]) {
  return {
    bid_user_base: BigInt(convertNumberForToken(originalBalance.bid_user_base, baseToken)),
    bid_user_quote: BigInt(convertNumberForToken(originalBalance.bid_user_quote, quoteToken)),
    ask_user_base: BigInt(convertNumberForToken(originalBalance.ask_user_base, baseToken)),
    ask_user_quote: BigInt(convertNumberForToken(originalBalance.ask_user_quote, quoteToken)),
  };
}

function parseOrder(state: OrderState) {
  if (!state) {
    return null;
  }
  return Object.assign({}, state.orderInput, { filledSell: state.filledSell, filledBuy: state.filledBuy });
}

function buildOrder(originalOrder, [baseTokenID, quoteTokenID], [baseToken, quoteToken], side: OrderSide) {
  let obj: any = {
    baseAmount: BigInt(convertNumberForToken(originalOrder.amount, baseToken)),
    price: BigInt(convertNumberForToken(originalOrder.price, baseToken)),
    finishedQuote: BigInt(convertNumberForToken(originalOrder.finished_quote, quoteToken)),
    finishedBase: BigInt(convertNumberForToken(originalOrder.finished_base, baseToken)),
    status: 0,
    role: originalOrder.role,
    accountID: originalOrder.accountID,
    orderId: originalOrder.ID,
  };
  obj.quoteAmount = BigInt(convertNumberForToken(originalOrder.amount * originalOrder.price, quoteToken));
  if (side == OrderSide.Sell) {
    obj.tokenSell = baseTokenID;
    obj.tokenBuy = quoteTokenID;
    obj.totalSell = obj.baseAmount;
    obj.totalBuy = obj.quoteAmount;
    obj.filledSell = obj.finishedBase;
    obj.filledBuy = obj.finishedQuote;
  } else if (side == OrderSide.Buy) {
    obj.tokenSell = quoteTokenID;
    obj.tokenBuy = baseTokenID;
    obj.totalSell = obj.quoteAmount;
    obj.totalBuy = obj.baseAmount;
    obj.filledSell = obj.finishedQuote;
    obj.filledBuy = obj.finishedBase;
  } else {
    throw new Error('invalid order side ' + side);
  }
  obj.side = side;
  return obj;
}

function checkOrder(orderSaved, beforeState, [baseToken, quoteToken]) {
  let finishedQuote = BigInt(convertNumberForToken(beforeState.finished_quote, quoteToken));
  let finishedBase = BigInt(convertNumberForToken(beforeState.finished_base, baseToken));

  if (orderSaved.side == OrderSide.Sell) {
    assert(orderSaved.filledSell === finishedBase);
    assert(orderSaved.filledBuy === finishedQuote);
  } else {
    assert(orderSaved.filledBuy === finishedBase);
    assert(orderSaved.filledSell === finishedQuote);
  }
}

function patchOrder(orderBefore, afterState, [baseToken, quoteToken]) {
  let finishedQuote = BigInt(convertNumberForToken(afterState.finished_quote, quoteToken));
  let finishedBase = BigInt(convertNumberForToken(afterState.finished_base, baseToken));

  return Object.assign(
    {},
    orderBefore,
    orderBefore.side == OrderSide.Sell
      ? {
          filledSell: finishedBase,
          filledBuy: finishedQuote,
        }
      : {
          filledSell: finishedQuote,
          filledBuy: finishedBase,
        },
  );
}

function parseSignature(sigStr: string, hash) {
  const sigBuf = Buffer.from(sigStr, 'hex');
  let r8 = babyJub.unpackPoint(sigBuf.slice(0, 32));
  let sign = {
    hash,
    S: ffutils.leBuff2int(sigBuf.slice(32, 64)),
    R8x: r8[0],
    R8y: r8[1],
  };

  return sign;
}

function handleTrade(state: GlobalState, accounts: Array<Account>, trade) {
  const askIsTaker = trade.ask_role == 'TAKER';
  const bidIsTaker = !askIsTaker;
  const askUserID = BigInt(trade.ask_user_id);
  const bidUserID = BigInt(trade.bid_user_id);
  const askOrderID = BigInt(trade.ask_order_id);
  const bidOrderID = BigInt(trade.bid_order_id);
  const [baseToken, quoteToken] = getBaseAndQuoteOfTrade(trade);
  const baseTokenID = getTokenId(baseToken);
  const quoteTokenID = getTokenId(quoteToken);

  const savedAskOrder = state.hasOrder(askUserID, askOrderID) ? state.getAccountOrderByOrderId(askUserID, askOrderID) : null;
  const savedBidOrder = state.hasOrder(bidUserID, bidOrderID) ? state.getAccountOrderByOrderId(bidUserID, bidOrderID) : null;

  if (savedAskOrder) {
    checkOrder(savedAskOrder, trade.state_before.ask_order_state || trade.state_before.order_states[0], [baseToken, quoteToken]);
  }
  if (savedBidOrder) {
    checkOrder(savedBidOrder, trade.state_before.bid_order_state || trade.state_before.order_states[1], [baseToken, quoteToken]);
  }

  const askOrderStateBefore =
    parseOrder(savedAskOrder) ||
    buildOrder(
      Object.assign(trade.ask_order || trade.state_before.ask_order_state, {
        ID: askOrderID,
        accountID: askUserID,
        role: trade.ask_role,
      }),
      [baseTokenID, quoteTokenID],
      [baseToken, quoteToken],
      OrderSide.Sell,
    );
  const bidOrderStateBefore =
    parseOrder(savedBidOrder) ||
    buildOrder(
      Object.assign(trade.bid_order || trade.state_before.bid_order_state, {
        ID: bidOrderID,
        accountID: bidUserID,
        role: trade.bid_role,
      }),
      [baseTokenID, quoteTokenID],
      [baseToken, quoteToken],
      OrderSide.Buy,
    );

  //console.log({bidOrderStateAfter});
  // let orderStateBefore = new Map([
  //   [BigInt(trade.ask_order_id), askOrderStateBefore],
  //   [BigInt(trade.bid_order_id), bidOrderStateBefore],
  // ]);
  // let orderStateAfter = new Map([
  //   [BigInt(trade.ask_order_id), askOrderStateAfter],
  //   [BigInt(trade.bid_order_id), bidOrderStateAfter],
  // ]);

  // first, we check the related two orders are already known to 'GlobalState'
  function checkGlobalStateKnowsOrder(order, originalData) {
    const isNewOrder = order.finishedBase == '0' && order.finishedQuote == '0';
    if (isNewOrder) {
      assert(!state.hasOrder(order.accountID, order.orderId), 'invalid new order');

      let orderToPut = new OrderInput({
        accountID: order.accountID,
        orderId: order.orderId,
        tokenSell: order.tokenSell,
        tokenBuy: order.tokenBuy,
        totalSell: order.totalSell,
        totalBuy: order.totalBuy,
        side: order.side,
        sig: null,
      });
      if (originalData) {
        assert(originalData.signature, 'malform trade msg: no signature in order detail');
        orderToPut.sig = parseSignature(originalData.signature, hashOrderInput(orderToPut));
      } else {
        assert(accounts[Number(order.accountID)], 'no account provided for replaying message');
        orderToPut.signWith(accounts[Number(order.accountID)]);
      }
      state.updateOrderState(order.accountID, OrderState.fromOrderInput(orderToPut));
    } else {
      assert(
        state.hasOrder(order.accountID, order.orderId),
        `invalid old order ${order.orderId} (${order.accountID}'s), too many open orders?`,
      );
    }
  }
  checkGlobalStateKnowsOrder(askOrderStateBefore, trade.ask_order);
  checkGlobalStateKnowsOrder(bidOrderStateBefore, trade.bid_order);

  const askOrderStateAfter = patchOrder(askOrderStateBefore, trade.state_after.ask_order_state || trade.state_after.order_states[0], [
    baseToken,
    quoteToken,
  ]);
  const bidOrderStateAfter = patchOrder(bidOrderStateBefore, trade.state_after.bid_order_state || trade.state_after.order_states[1], [
    baseToken,
    quoteToken,
  ]);

  compatibleBalance(trade.state_before);
  compatibleBalance(trade.state_after);

  // second check order states are same as 'GlobalState'
  function checkState(balanceState, askOrder, bidOrder) {
    let balanceStateLocal = {
      bid_user_base: state.getTokenBalance(bidUserID, baseTokenID),
      ask_user_base: state.getTokenBalance(askUserID, baseTokenID),
      bid_user_quote: state.getTokenBalance(bidUserID, quoteTokenID),
      ask_user_quote: state.getTokenBalance(askUserID, quoteTokenID),
    };
    checkEqByKeys(balanceStateLocal, balanceState);
    let askOrderLocal = state.getAccountOrderByOrderId(askUserID, askOrderID);
    let bidOrderLocal = state.getAccountOrderByOrderId(bidUserID, bidOrderID);
    checkEqByKeys(askOrderLocal, askOrder, ['filledSell', 'filledBuy']);
    checkEqByKeys(bidOrderLocal, bidOrder, ['filledSell', 'filledBuy']);
  }
  checkState(parseBalance(trade.state_before.balance, [baseToken, quoteToken]), askOrderStateBefore, bidOrderStateBefore);
  // now we construct the trade and exec it
  let spotTradeTx = bidIsTaker
    ? {
        order1AccountID: askOrderStateBefore.accountID,
        order2AccountID: bidOrderStateBefore.accountID,
        tokenID1to2: baseTokenID,
        tokenID2to1: quoteTokenID,
        amount1to2: BigInt(convertNumberForToken(trade.amount, baseToken)),
        amount2to1: BigInt(convertNumberForToken(trade.quote_amount, quoteToken)),
        order1Id: askOrderStateBefore.orderId,
        order2Id: bidOrderStateBefore.orderId,
      }
    : {
        order1AccountID: bidOrderStateBefore.accountID,
        order2AccountID: askOrderStateBefore.accountID,
        tokenID1to2: quoteTokenID,
        tokenID2to1: baseTokenID,
        amount1to2: BigInt(convertNumberForToken(trade.quote_amount, quoteToken)),
        amount2to1: BigInt(convertNumberForToken(trade.amount, baseToken)),
        order1Id: bidOrderStateBefore.orderId,
        order2Id: askOrderStateBefore.orderId,
      };
  state.SpotTrade(spotTradeTx);
  // finally we check the state after this trade
  checkState(parseBalance(trade.state_after.balance, [baseToken, quoteToken]), askOrderStateAfter, bidOrderStateAfter);

  console.log('trade', trade.id, 'test done');
}

function handleUser(state: GlobalState, { l2_pubkey, user_id }) {
  let compressed = Buffer.from(l2_pubkey.slice(2), 'hex');
  let sign = (compressed[31] & 0x80) == 0 ? 0 : 1;
  let pt = babyJub.unpackPoint(compressed);
  let ay = BigInt(pt[1].toString(10));

  state.UpdateL2Key(
    {
      accountID: BigInt(user_id),
      sign: BigInt(sign),
      ay,
    },
    true,
  );
}

function handleWithdraw(state: GlobalState, withdraw) {
  //{"timestamp":1616062584.0,"user_id":1,"asset":"ETH","business":"deposit","change":"1000000","balance":"1000000","detail":"{\"id\":3}"}}
  const tokenID = getTokenId(withdraw.asset);
  const userID = BigInt(withdraw.user_id);
  //notice, amount passed to tx is still posistive
  const delta = BigInt(convertNumberForToken(withdraw.change, withdraw.asset));
  assert(delta < BigInt(0));
  let withdrawTx = { accountID: userID, tokenID, amount: delta * BigInt(-1), signature: null, nonce: BigInt(0), oldBalance: BigInt(0) };
  withdrawTx = state.fillWithdrawTx(withdrawTx);
  const txHash = hashWithdraw(withdrawTx);
  withdrawTx.signature = parseSignature(withdraw.signature, txHash);
  state.Withdraw(withdrawTx);

  const balanceAfter = BigInt(convertNumberForToken(withdraw.balance, withdraw.asset));
  const expectedBalanceAfter = state.getTokenBalance(userID, tokenID);
  assert(expectedBalanceAfter == balanceAfter, 'invalid balance after');
}

function handleDeposit(state: GlobalState, accounts: Array<Account>, deposit) {
  const tokenID = getTokenId(deposit.asset);
  const userID = BigInt(deposit.user_id);
  const balanceAfter = BigInt(convertNumberForToken(deposit.balance, deposit.asset));
  const delta = BigInt(convertNumberForToken(deposit.change, deposit.asset));
  const balanceBefore = balanceAfter - delta;
  assert(balanceBefore >= 0n, 'invalid balance ' + deposit.toString());
  const expectedBalanceBefore = state.getTokenBalance(userID, tokenID);
  assert(expectedBalanceBefore == balanceBefore, 'invalid balance before');
  if (state.hasAccount(userID)) {
    state.DepositToOld({ accountID: userID, tokenID, amount: delta });
  } else {
    let account = accounts[Number(userID)];
    if (!account) {
      console.log(`create random account for account id {}`, userID);
      account = Account.random();
      accounts[Number(userID)] = account;
    }

    state.DepositToNew({
      accountID: userID,
      tokenID,
      amount: delta,
      sign: BigInt(account.sign),
      ay: account.ay,
    });
  }
  // skip check balanceAfter here... the function is too simple to be wrong...
}

function handleTransfer(state: GlobalState, transfer) {
  const tokenID = getTokenId(transfer.asset);
  const userID1 = BigInt(transfer.user_from);
  const userID2 = BigInt(transfer.user_to);
  const amount = BigInt(convertNumberForToken(transfer.amount, transfer.asset));

  let transferTx = { from: userID1, to: userID2, tokenID, amount, signature: null };
  let fullTransferTx = state.fillTransferTx(transferTx);
  const txHash = hashTransfer(fullTransferTx);
  fullTransferTx.signature = parseSignature(transfer.signature, txHash);
  state.Transfer(fullTransferTx);
}

function replayMsgs(fileName) {
  const maxMsgsNumToTest = 1000;
  let lines = fs
    .readFileSync(path.join(__dirname, fileName || 'testdata/msgs_float.jsonl'), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .slice(0, maxMsgsNumToTest);
  let msgs = lines.map(function (line) {
    return JSON.parse(line);
  });

  const nTxs = 2;
  const balanceLevels = 3;
  const orderLevels = 4;
  const accountLevels = 4;
  const maxOrderNum = Math.pow(2, orderLevels);
  const maxAccountNum = Math.pow(2, accountLevels);
  const maxTokenNum = Math.pow(2, balanceLevels);
  // `enable_self_trade` test purpose only
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs, { verbose });
  console.log('genesis root', state.root());
  //const maxUserID = Math.max(...trades.map(trade => [trade.ask_user_id, trade.bid_user_id]).flat());
  //console.log('maxUserID', maxUserID);
  //assert(maxUserID < maxAccountNum);
  let accounts: Array<Account> = [];
  for (let i = 0; i < maxAccountNum; i++) {
    //next order pos has no relation with order id
    const accountID = state.createNewAccount({ next_order_id: 0n });
    assert(accountID == BigInt(i), 'invalid account id');
    // accounts[i] = Account.random();
    //  for (let j = 0; j < maxTokenNum; j++) {
    //    state.setTokenBalance(accountID, BigInt(j), 1_000_000n); // default balance
    //  }
  }
  for (const msg of msgs) {
    // TODO: update "testdata/msgs_float.jsonl" and the folllwing codes to the newest message scheme.
    // Old version: We only have "BalanceMessage". change > 0 is for deposit. change < 0 is for withdraw.
    // New version: We have "DepositMessage" and "WithdrawMessage". "BalanceMessage" is deprecated.
    if (msg.type === 'BalanceMessage' || msg.type == 'DepositMessage') {
      // handle deposit or withdraw
      const change = BigInt(convertNumberForToken(msg.value.change, msg.value.asset));
      if (change < 0n) {
        throw new Error('only support deposit now');
      }
      handleDeposit(state, accounts, msg.value);
    } else if (msg.type == 'TradeMessage') {
      // handle trades
      const trade = msg.value;
      handleTrade(state, accounts, trade);
    } else if (msg.type == 'UserMessage') {
      handleUser(state, msg.value);
    } else if (msg.type == 'WithdrawMessage') {
      handleWithdraw(state, msg.value);
    } else if (msg.type == 'TransferMessage') {
      handleTransfer(state, msg.value);
    } else {
      //console.log('skip msg', msg.type);
    }
  }

  state.flushWithNop();

  return {
    blocks: state.bufferedBlocks,
    component: {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    },
  };
}

async function exportCircuitAndTestData(blocks, component) {
  const circuitDir = path.join('testdata', circuitSrcToName(component.main));
  const dataDir = path.join(circuitDir, 'data');
  await snarkit.utils.writeCircuitIntoDir(circuitDir, component);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    await snarkit.utils.writeInputOutputIntoDir(path.join(dataDir, printf('%04d', i)), block, {});
  }
  return circuitDir;
}

async function mainTest() {
  const replayOnly = process.argv[2];
  const dataFile = process.argv[3];

  const { blocks, component } = replayMsgs(dataFile);
  console.log(`generate ${blocks.length} blocks`);

  // check all the blocks forged are valid for the block circuit
  // So we can ensure logics of matchengine VS GlobalState VS circuit are same!
  const circuitDir = await exportCircuitAndTestData(blocks, component);

  if (replayOnly === 'skip') {
    console.log('replay done, circuit output at', circuitDir);
    return;
  }

  const testOptions = {
    alwaysRecompile: true,
    verbose: false,
    backend: 'auto',
    witnessFileType: 'wtns',
  };
  await snarkit.testCircuitDir(circuitDir, path.join(circuitDir, 'data'), testOptions);
}

mainTest();
