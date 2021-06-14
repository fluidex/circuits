import { GlobalState } from './global_state';
import * as snarkit from 'snarkit';
import { circuitSrcToName, OrderState } from './common';
import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
const printf = require('printf');
import { inspect } from 'util';
import { Account } from '../helper.ts/account';
import { OrderInput, OrderSide } from '../helper.ts/state-utils';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
inspect.defaultOptions.depth = null;

const verbose = false;

function getTokenId(tokenName) {
  return { ETH: 0n, USDT: 1n }[tokenName];
}

function getTokenPrec(tokenName) {
  return { ETH: 6, USDT: 6 }[tokenName];
}

function convertNumber(num, tokenName) {
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

function parseBalance(originalBalance, [baseToken, quoteToken]) {
  return {
    bid_user_base: BigInt(convertNumber(originalBalance.bid_user_base, baseToken)),
    bid_user_quote: BigInt(convertNumber(originalBalance.bid_user_quote, quoteToken)),
    ask_user_base: BigInt(convertNumber(originalBalance.ask_user_base, baseToken)),
    ask_user_quote: BigInt(convertNumber(originalBalance.ask_user_quote, quoteToken)),
  };
}

function parseOrder(originalOrder, [baseTokenID, quoteTokenID], [baseToken, quoteToken], side: OrderSide) {
  let obj: any = {
    baseAmount: BigInt(convertNumber(originalOrder.amount, baseToken)),
    price: BigInt(convertNumber(originalOrder.price, baseToken)),
    finishedQuote: BigInt(convertNumber(originalOrder.finished_quote, quoteToken)),
    finishedBase: BigInt(convertNumber(originalOrder.finished_base, baseToken)),
    status: 0,
    role: originalOrder.role,
    accountID: originalOrder.accountID,
    orderId: originalOrder.ID,
  };
  obj.quoteAmount = BigInt(convertNumber(originalOrder.amount * originalOrder.price, quoteToken));
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

  const askOrderStateBefore = parseOrder(
    Object.assign(trade.state_before.ask_order_state, {
      ID: askOrderID,
      accountID: askUserID,
      role: trade.ask_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    OrderSide.Sell,
  );
  const bidOrderStateBefore = parseOrder(
    Object.assign(trade.state_before.bid_order_state, {
      ID: bidOrderID,
      accountID: bidUserID,
      role: trade.bid_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    OrderSide.Buy,
  );
  const askOrderStateAfter = parseOrder(
    Object.assign(trade.state_after.ask_order_state, {
      ID: askOrderID,
      accountID: askUserID,
      role: trade.ask_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    OrderSide.Sell,
  );
  const bidOrderStateAfter = parseOrder(
    Object.assign(trade.state_after.bid_order_state, {
      ID: bidOrderID,
      accountID: bidUserID,
      role: trade.bid_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    OrderSide.Buy,
  );
  //console.log({bidOrderStateAfter});
  let orderStateBefore = new Map([
    [BigInt(trade.ask_order_id), askOrderStateBefore],
    [BigInt(trade.bid_order_id), bidOrderStateBefore],
  ]);
  let orderStateAfter = new Map([
    [BigInt(trade.ask_order_id), askOrderStateAfter],
    [BigInt(trade.bid_order_id), bidOrderStateAfter],
  ]);

  // first, we check the related two orders are already known to 'GlobalState'
  function checkGlobalStateKnowsOrder(order) {
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
      orderToPut.signWith(accounts[Number(order.accountID)]);
      state.updateOrderState(order.accountID, OrderState.fromOrderInput(orderToPut));
    } else {
      assert(state.hasOrder(order.accountID, order.orderId), 'invalid old order, too many open orders?');
    }
  }
  checkGlobalStateKnowsOrder(askOrderStateBefore);
  checkGlobalStateKnowsOrder(bidOrderStateBefore);

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
        amount1to2: BigInt(convertNumber(trade.amount, baseToken)),
        amount2to1: BigInt(convertNumber(trade.quote_amount, quoteToken)),
        order1Id: askOrderStateBefore.orderId,
        order2Id: bidOrderStateBefore.orderId,
      }
    : {
        order1AccountID: bidOrderStateBefore.accountID,
        order2AccountID: askOrderStateBefore.accountID,
        tokenID1to2: quoteTokenID,
        tokenID2to1: baseTokenID,
        amount1to2: BigInt(convertNumber(trade.quote_amount, quoteToken)),
        amount2to1: BigInt(convertNumber(trade.amount, baseToken)),
        order1Id: bidOrderStateBefore.orderId,
        order2Id: askOrderStateBefore.orderId,
      };
  state.SpotTrade(spotTradeTx);
  // finally we check the state after this trade
  checkState(parseBalance(trade.state_after.balance, [baseToken, quoteToken]), askOrderStateAfter, bidOrderStateAfter);

  console.log('trade', trade.id, 'test done');
}

function handleDeposit(state: GlobalState, accounts: Array<Account>, deposit) {
  //{"timestamp":1616062584.0,"user_id":1,"asset":"ETH","business":"deposit","change":"1000000","balance":"1000000","detail":"{\"id\":3}"}}
  const tokenID = getTokenId(deposit.asset);
  const userID = BigInt(deposit.user_id);
  const balanceAfter = BigInt(convertNumber(deposit.balance, deposit.asset));
  const delta = BigInt(convertNumber(deposit.change, deposit.asset));
  const balanceBefore = balanceAfter - delta;
  assert(balanceBefore >= 0n, 'invalid balance ' + deposit.toString());
  const expectedBalanceBefore = state.getTokenBalance(userID, tokenID);
  assert(expectedBalanceBefore == balanceBefore, 'invalid balance before');
  let account = accounts[Number(userID)];
  if (state.hasAccount(userID)) {
    state.DepositToOld({ accountID: userID, tokenID, amount: delta });
  } else {
    state.DepositToNew({
      accountID: userID,
      tokenID,
      amount: delta,
      ethAddr: Scalar.fromString(account.ethAddr, 16),
      sign: BigInt(account.sign),
      ay: account.ay,
    });
  }
  // skip check balanceAfter here... the function is too simple to be wrong...
}

function replayMsgs() {
  const maxMsgsNumToTest = 1000;
  let lines = fs
    .readFileSync(path.join(__dirname, 'testdata/msgs_float.jsonl'), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .slice(0, maxMsgsNumToTest);
  let msgs = lines.map(function (line) {
    return JSON.parse(line);
  });

  const nTxs = 2;
  const balanceLevels = 2;
  const orderLevels = 3;
  const accountLevels = 2;
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
    // currently the matchengine generates order id from 1
    const accountID = state.createNewAccount({ next_order_id: 1n });
    assert(accountID == BigInt(i), 'invalid account id');
    accounts[i] = Account.random();
    //  for (let j = 0; j < maxTokenNum; j++) {
    //    state.setTokenBalance(accountID, BigInt(j), 1_000_000n); // default balance
    //  }
  }
  for (const msg of msgs) {
    if (msg.type === 'BalanceMessage') {
      // handle deposit or withdraw
      const change = BigInt(convertNumber(msg.value.change, msg.value.asset));
      if (change < 0n) {
        throw new Error('only support deposit now');
      }
      handleDeposit(state, accounts, msg.value);
    } else if (msg.type == 'TradeMessage') {
      // handle trades
      const trade = msg.value;
      handleTrade(state, accounts, trade);
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
  const { blocks, component } = replayMsgs();
  console.log(`generate ${blocks.length} blocks`);

  // check all the blocks forged are valid for the block circuit
  // So we can ensure logics of matchengine VS GlobalState VS circuit are same!
  const circuitDir = await exportCircuitAndTestData(blocks, component);
  const testOptions = {
    alwaysRecompile: true,
    verbose: false,
    backend: 'auto',
    witnessFileType: 'wtns',
  };
  await snarkit.testCircuitDir(circuitDir, path.join(circuitDir, 'data'), testOptions);
}

mainTest();
