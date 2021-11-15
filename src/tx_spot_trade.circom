// Generated from tpl/ejs/src/tx_spot_trade.circom.ejs. Don't modify this file manually
// This circuit dedicate for a simple unit test of spot_trade.circom 

include "./decode_tx.circom";
include "./spot_trade.circom";

template TestSpotTrade(balanceLevels, orderLevels, accountLevels) {


    // public inputs
    // TODO: replace all the public inputs with sha3 hash later
    signal input oldRoot;
    signal input newRoot;
    signal input txDataHashHi;
    signal input txDataHashLo;

    // transactions
    signal input txsType[1];
    signal input encodedTxs[1][ TxLength()];

    // State
    signal input balancePathElements[1][4][balanceLevels][1]; // index meanings: [tx idx][sender, receiver, sender, receiver][levels][siblings]
    signal input orderPathElements[1][2][orderLevels][1]; // index meanings: [tx idx][orderAccount1, orderAccount2][levels][siblings]
    signal input accountPathElements[1][2][accountLevels][1]; // index meanings: [tx idx][sender, receiver][levels][siblings]

    // roots
    signal input orderRoots[1][2];
    signal input oldAccountRoots[1];
    signal input newAccountRoots[1];

    component decodedTx = DecodeTx();
    for (var i = 0; i < TxLength(); i++) {
        decodedTx.in[i] <== encodedTxs[0][i];
    }

    component processSpotTrade = SpotTrade(balanceLevels, orderLevels, accountLevels);
    processSpotTrade.enabled <== 1;

    
        processSpotTrade.oldOrder1ID <== decodedTx.oldOrder1ID;
        processSpotTrade.oldOrder1TokenSell <== decodedTx.oldOrder1TokenSell;
        processSpotTrade.oldOrder1FilledSell <== decodedTx.oldOrder1FilledSell;
        processSpotTrade.oldOrder1AmountSell <== decodedTx.oldOrder1AmountSell;
        processSpotTrade.oldOrder1TokenBuy <== decodedTx.oldOrder1TokenBuy;
        processSpotTrade.oldOrder1FilledBuy <== decodedTx.oldOrder1FilledBuy;
        processSpotTrade.oldOrder1AmountBuy <== decodedTx.oldOrder1AmountBuy;
        processSpotTrade.newOrder1ID <== decodedTx.newOrder1ID;
        processSpotTrade.newOrder1TokenSell <== decodedTx.newOrder1TokenSell;
        processSpotTrade.newOrder1FilledSell <== decodedTx.newOrder1FilledSell;
        processSpotTrade.newOrder1AmountSell <== decodedTx.newOrder1AmountSell;
        processSpotTrade.newOrder1TokenBuy <== decodedTx.newOrder1TokenBuy;
        processSpotTrade.newOrder1FilledBuy <== decodedTx.newOrder1FilledBuy;
        processSpotTrade.newOrder1AmountBuy <== decodedTx.newOrder1AmountBuy;
        processSpotTrade.oldOrder2ID <== decodedTx.oldOrder2ID;
        processSpotTrade.oldOrder2TokenSell <== decodedTx.oldOrder2TokenSell;
        processSpotTrade.oldOrder2FilledSell <== decodedTx.oldOrder2FilledSell;
        processSpotTrade.oldOrder2AmountSell <== decodedTx.oldOrder2AmountSell;
        processSpotTrade.oldOrder2TokenBuy <== decodedTx.oldOrder2TokenBuy;
        processSpotTrade.oldOrder2FilledBuy <== decodedTx.oldOrder2FilledBuy;
        processSpotTrade.oldOrder2AmountBuy <== decodedTx.oldOrder2AmountBuy;
        processSpotTrade.newOrder2ID <== decodedTx.newOrder2ID;
        processSpotTrade.newOrder2TokenSell <== decodedTx.newOrder2TokenSell;
        processSpotTrade.newOrder2FilledSell <== decodedTx.newOrder2FilledSell;
        processSpotTrade.newOrder2AmountSell <== decodedTx.newOrder2AmountSell;
        processSpotTrade.newOrder2TokenBuy <== decodedTx.newOrder2TokenBuy;
        processSpotTrade.newOrder2FilledBuy <== decodedTx.newOrder2FilledBuy;
        processSpotTrade.newOrder2AmountBuy <== decodedTx.newOrder2AmountBuy;
        processSpotTrade.enableBalanceCheck1 <== decodedTx.enableBalanceCheck1;
        processSpotTrade.enableBalanceCheck2 <== decodedTx.enableBalanceCheck2;
        processSpotTrade.enableSigCheck1 <== decodedTx.enableSigCheck1;
        processSpotTrade.enableSigCheck2 <== decodedTx.enableSigCheck2;
        processSpotTrade.tokenID1 <== decodedTx.tokenID1;
        processSpotTrade.tokenID2 <== decodedTx.tokenID2;

    
        processSpotTrade.order1Pos <== decodedTx.order1Pos;
        processSpotTrade.order1AccountID <== decodedTx.accountID1;
        processSpotTrade.order1AccountNonce <== decodedTx.nonce1;
        processSpotTrade.order1AccountSign <== decodedTx.sign1;
        processSpotTrade.order1AccountAy <== decodedTx.ay1;
        processSpotTrade.order2Pos <== decodedTx.order2Pos;
        processSpotTrade.order2AccountID <== decodedTx.accountID2;
        processSpotTrade.order2AccountNonce <== decodedTx.nonce2;
        processSpotTrade.order2AccountSign <== decodedTx.sign2;
        processSpotTrade.order2AccountAy <== decodedTx.ay2;

        processSpotTrade.amount1to2 <== decodedTx.amount1;
        processSpotTrade.amount2to1 <== decodedTx.amount2;
        processSpotTrade.order1TokenSellBalance <== decodedTx.balance1;
        // for reusing universal checker, balance2 here must be a leaf of the final merkle tree
        processSpotTrade.order2TokenBuyBalance <== decodedTx.balance2 - decodedTx.amount1;
        processSpotTrade.order2TokenSellBalance <== decodedTx.balance3;
        processSpotTrade.order1TokenBuyBalance <== decodedTx.balance4 - decodedTx.amount2;

    
        processSpotTrade.orderRoot1 <== orderRoots[0][0];
        processSpotTrade.orderRoot2 <== orderRoots[0][1];

        for (var j = 0; j < orderLevels; j++) {
            processSpotTrade.orderPathElements[0][j][0] <== orderPathElements[0][0][j][0];
            processSpotTrade.orderPathElements[1][j][0] <== orderPathElements[0][1][j][0];
        }
        for (var j = 0; j < balanceLevels; j++) {
            processSpotTrade.oldAccount1BalancePathElements[j][0] <== balancePathElements[0][0][j][0];
            processSpotTrade.tmpAccount1BalancePathElements[j][0] <== balancePathElements[0][3][j][0];
            processSpotTrade.oldAccount2BalancePathElements[j][0] <== balancePathElements[0][2][j][0];
            processSpotTrade.tmpAccount2BalancePathElements[j][0] <== balancePathElements[0][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processSpotTrade.oldAccount1PathElements[j][0] <== accountPathElements[0][0][j][0];
            processSpotTrade.tmpAccount2PathElements[j][0] <== accountPathElements[0][1][j][0];
        }
        processSpotTrade.oldAccountRoot <== oldAccountRoots[0];
        processSpotTrade.newAccountRoot <== newAccountRoots[0];


}
