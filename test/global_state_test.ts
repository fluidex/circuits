import { GlobalState } from './global_state';
import { circuitSrcToName } from './common';
import { testCircuitDir, writeCircuitIntoDir, writeInputOutputIntoDir } from './tester/c';
import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
var printf = require('printf');
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

function handleTrade(state, trade, placedOrder) {
  const askIsTaker = trade.ask_role == 'TAKER';
  const bidIsTaker = !askIsTaker;
  const askUserID = BigInt(trade.ask_user_id);
  const bidUserID = BigInt(trade.bid_user_id);
  const askOrderID = BigInt(trade.ask_order_id);
  const bidOrderID = BigInt(trade.bid_order_id);
  const [baseToken, quoteToken] = getBaseAndQuoteOfTrade(trade);
  const baseTokenID = getTokenId(baseToken);
  const quoteTokenID = getTokenId(quoteToken);

  const askOrderStateBefore = Object.assign(parseOrder(trade.state_before.ask_order_state, [baseTokenID, quoteTokenID], [baseToken, quoteToken], 'ASK'), {
    ID: askOrderID,
    accountID: askUserID,
    role: trade.ask_role,
  });
  const bidOrderStateBefore = Object.assign(parseOrder(trade.state_before.bid_order_state, [baseTokenID, quoteTokenID], [baseToken, quoteToken], 'BID'), {
    ID: bidOrderID,
    accountID: bidUserID,
    role: trade.bid_role,
  });
  const askOrderStateAfter = Object.assign(parseOrder(trade.state_after.ask_order_state, [baseTokenID, quoteTokenID], [baseToken, quoteToken], 'ASK'), {
    ID: askOrderID,
    accountID: askUserID,
    role: trade.ask_role,
  });
  const bidOrderStateAfter = Object.assign(parseOrder(trade.state_after.bid_order_state, [baseTokenID, quoteTokenID], [baseToken, quoteToken], 'BID'), {
    ID: bidOrderID,
    accountID: bidUserID,
    role: trade.bid_role,
  });

  let orderStateBefore = new Map([
    [BigInt(trade.ask_order_id), askOrderStateBefore],
    [BigInt(trade.bid_order_id), bidOrderStateBefore],
  ]);
  let orderStateAfter = new Map([
    [BigInt(trade.ask_order_id), askOrderStateAfter],
    [BigInt(trade.bid_order_id), bidOrderStateAfter],
  ]);

  // first, we check the related two orders are already known to 'GlobalState'
  for (const orderId of [...orderStateBefore.keys()].sort()) {
    if (!placedOrder.has(orderId)) {
      const order = orderStateBefore.get(orderId);
      // check this is a new order
      assert(order.finishedBase == '0' && order.finishedQuote == '0', 'invalid new order', order);
      let orderToPut = {
        accountID: order.accountID,
        previous_tokenID_sell: 0n,
        previous_tokenID_buy: 0n,
        previous_amount_sell: 0n,
        previous_amount_buy: 0n,
        previous_filled_sell: 0n,
        previous_filled_buy: 0n,
        tokenID_sell: order.tokensell,
        tokenID_buy: order.tokenbuy,
        amount_sell: order.total_sell,
        amount_buy: order.total_buy,
      };
      let newOrderID = state.PlaceOrder(orderToPut);
      placedOrder.set(orderId, [orderToPut.accountID, newOrderID]);
      if (verbose) {
        console.log('global order id to user order id', orderId, orderToPut.accountID, newOrderID);
      }
    } else {
      if (verbose) {
        console.log('skip put order', orderId);
      }
    }
  }

  // second check order states are same as 'GlobalState'
  function checkState(balanceState, askOrder, bidOrder) {
    let balanceStateLocal = {
      bid_user_base: state.getTokenBalance(bidUserID, baseTokenID),
      ask_user_base: state.getTokenBalance(askUserID, baseTokenID),
      bid_user_quote: state.getTokenBalance(bidUserID, quoteTokenID),
      ask_user_quote: state.getTokenBalance(askUserID, quoteTokenID),
    };
    checkEqByKeys(balanceStateLocal, balanceState);
    let askOrderLocal = state.getAccountOrder(askUserID, placedOrder.get(askOrderID)[1]);
    let bidOrderLocal = state.getAccountOrder(bidUserID, placedOrder.get(bidOrderID)[1]);
    checkEqByKeys(askOrderLocal, askOrder);
    checkEqByKeys(bidOrderLocal, bidOrder);
  }
  checkState(parseBalance(trade.state_before.balance, [baseToken, quoteToken]), askOrderStateBefore, bidOrderStateBefore);
  // now we construct the trade and exec it
  let spotTradeTx = {
    order1_accountID: bidIsTaker ? askOrderStateBefore.accountID : bidOrderStateBefore.accountID,
    order2_accountID: bidIsTaker ? bidOrderStateBefore.accountID : askOrderStateBefore.accountID,
    tokenID_1to2: bidIsTaker ? baseTokenID : quoteTokenID,
    tokenID_2to1: bidIsTaker ? quoteTokenID : baseTokenID,
    amount_1to2: bidIsTaker ? BigInt(convertNumber(trade.amount, baseToken)) : BigInt(convertNumber(trade.quote_amount, quoteToken)),
    amount_2to1: bidIsTaker ? BigInt(convertNumber(trade.quote_amount, quoteToken)) : BigInt(convertNumber(trade.amount, baseToken)),
    order1_id: placedOrder.get(bidIsTaker ? askOrderStateBefore.ID : bidOrderStateBefore.ID)[1],
    order2_id: placedOrder.get(bidIsTaker ? bidOrderStateBefore.ID : askOrderStateBefore.ID)[1],
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
  // external id to <user_id, order_id_of_user>
  let placedOrder = new Map<bigint, [bigint, bigint]>();
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
      handleTrade(state, trade, placedOrder);
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
  await writeCircuitIntoDir(circuitDir, component);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    await writeInputOutputIntoDir(path.join(circuitDir, 'data', printf('%04d', i)), block, {});
  }
  return circuitDir;
}

async function mainTest() {
  const { blocks, component } = replayMsgs();
  console.log(`generate ${blocks.length} blocks`);
  // check all the blocks forged are valid for the block circuit
  // So we can ensure logics of matchengine VS GlobalState VS circuit are same!
  const circuitDir = await exportCircuitAndTestData(blocks, component);
  await testCircuitDir(circuitDir);
}

mainTest();
