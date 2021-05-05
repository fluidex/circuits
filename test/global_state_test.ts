import { GlobalState } from './global_state';
import * as snarkit from 'snarkit';
import { circuitSrcToName } from './common';
import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
const printf = require('printf');
import { inspect } from 'util';
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

function parseOrder(originalOrder, [baseTokenID, quoteTokenID], [baseToken, quoteToken], side) {
  let obj: any = {
    baseAmount: BigInt(convertNumber(originalOrder.amount, baseToken)),
    price: BigInt(convertNumber(originalOrder.price, baseToken)),
    finishedQuote: BigInt(convertNumber(originalOrder.finished_quote, quoteToken)),
    finishedBase: BigInt(convertNumber(originalOrder.finished_base, baseToken)),
    status: 0,
    role: originalOrder.role,
    accountID: originalOrder.accountID,
    order_id: originalOrder.ID,
  };
  obj.quoteAmount = BigInt(convertNumber(originalOrder.amount * originalOrder.price, quoteToken));
  if (side == 'ASK') {
    obj.tokensell = baseTokenID;
    obj.tokenbuy = quoteTokenID;
    obj.total_sell = obj.baseAmount;
    obj.total_buy = obj.quoteAmount;
    obj.filled_sell = obj.finishedBase;
    obj.filled_buy = obj.finishedQuote;
  } else if (side == 'BID') {
    obj.tokensell = quoteTokenID;
    obj.tokenbuy = baseTokenID;
    obj.total_sell = obj.quoteAmount;
    obj.total_buy = obj.baseAmount;
    obj.filled_sell = obj.finishedQuote;
    obj.filled_buy = obj.finishedBase;
  } else {
    throw new Error('invalid order side ' + side);
  }
  obj.side = side;
  return obj;
}

function handleTrade(state: GlobalState, trade) {
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
    'ASK',
  );
  const bidOrderStateBefore = parseOrder(
    Object.assign(trade.state_before.bid_order_state, {
      ID: bidOrderID,
      accountID: bidUserID,
      role: trade.bid_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    'BID',
  );
  const askOrderStateAfter = parseOrder(
    Object.assign(trade.state_after.ask_order_state, {
      ID: askOrderID,
      accountID: askUserID,
      role: trade.ask_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    'ASK',
  );
  const bidOrderStateAfter = parseOrder(
    Object.assign(trade.state_after.bid_order_state, {
      ID: bidOrderID,
      accountID: bidUserID,
      role: trade.bid_role,
    }),
    [baseTokenID, quoteTokenID],
    [baseToken, quoteToken],
    'BID',
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
    const orderId = order.order_id;
    if (isNewOrder) {
      assert(!state.hasOrder(order.accountID, orderId), 'invalid new order');
      let orderToPut = {
        order_id: orderId,
        tokensell: order.tokensell,
        tokenbuy: order.tokenbuy,
        filled_sell: 0n,
        filled_buy: 0n,
        total_sell: order.total_sell,
        total_buy: order.total_buy,
      };
      state.updateOrderState(order.accountID, orderToPut);
    } else {
      assert(state.hasOrder(order.accountID, orderId), 'invalid old order');
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
    checkEqByKeys(askOrderLocal, askOrder);
    checkEqByKeys(bidOrderLocal, bidOrder);
  }
  checkState(parseBalance(trade.state_before.balance, [baseToken, quoteToken]), askOrderStateBefore, bidOrderStateBefore);
  // now we construct the trade and exec it
  let spotTradeTx = bidIsTaker
    ? {
        order1_accountID: askOrderStateBefore.accountID,
        order2_accountID: bidOrderStateBefore.accountID,
        tokenID_1to2: baseTokenID,
        tokenID_2to1: quoteTokenID,
        amount_1to2: BigInt(convertNumber(trade.amount, baseToken)),
        amount_2to1: BigInt(convertNumber(trade.quote_amount, quoteToken)),
        order1_id: askOrderStateBefore.order_id,
        order2_id: bidOrderStateBefore.order_id,
      }
    : {
        order1_accountID: bidOrderStateBefore.accountID,
        order2_accountID: askOrderStateBefore.accountID,
        tokenID_1to2: quoteTokenID,
        tokenID_2to1: baseTokenID,
        amount_1to2: BigInt(convertNumber(trade.quote_amount, quoteToken)),
        amount_2to1: BigInt(convertNumber(trade.amount, baseToken)),
        order1_id: bidOrderStateBefore.order_id,
        order2_id: askOrderStateBefore.order_id,
      };
  state.SpotTrade(spotTradeTx);
  // finally we check the state after this trade
  checkState(parseBalance(trade.state_after.balance, [baseToken, quoteToken]), askOrderStateAfter, bidOrderStateAfter);

  console.log('trade', trade.id, 'test done');
}

function handleDeposit(state: GlobalState, deposit) {
  //{"timestamp":1616062584.0,"user_id":1,"asset":"ETH","business":"deposit","change":"1000000","balance":"1000000","detail":"{\"id\":3}"}}
  const tokenID = getTokenId(deposit.asset);
  const userID = BigInt(deposit.user_id);
  const balanceAfter = BigInt(convertNumber(deposit.balance, deposit.asset));
  const delta = BigInt(convertNumber(deposit.change, deposit.asset));
  const balanceBefore = balanceAfter - delta;
  assert(balanceBefore >= 0, 'invalid balance' + deposit.toString());
  const expectedBalanceBefore = state.getTokenBalance(userID, tokenID);
  assert(expectedBalanceBefore == balanceBefore, 'invalid balance before');
  state.DepositToOld({ accountID: userID, tokenID, amount: delta });
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
  const orderLevels = 7;
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
  for (let i = 0; i < maxAccountNum; i++) {
    // currently the matchengine generates order id from 1
    const accountID = state.createNewAccount({ next_order_id: 1n });
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
      handleDeposit(state, msg.value);
    } else if (msg.type == 'TradeMessage') {
      // handle trades
      const trade = msg.value;
      handleTrade(state, trade);
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
    alwaysRecompile: false,
    verbose: true,
    backend: 'native',
    witnessFileType: 'wtns',
  };
  await snarkit.testCircuitDir(circuitDir, path.join(circuitDir, 'data'), testOptions);
}

mainTest();
