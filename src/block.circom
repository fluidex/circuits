// Generated from tpl/ejs/src/block.circom.ejs. Don't modify this file manually
include "../node_modules/circomlib/circuits/compconstant.circom";
include "./lib/hash_state.circom";
include "./lib/sha256.circom";
include "./decode_tx.circom";
include "./encode_data.circom";
include "./deposit.circom";
include "./transfer.circom";
include "./withdraw.circom";
include "./spot_trade.circom";
include "./base_tx.circom";

/**
 * Process a rollup block and transactions inside
 * @param nTxs - number of transactions
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input encodedTxs[nTxs] - {Array(Field)} - encoded transactions
 * @input balancePathElements[nTxs][2][balanceLevels][1] - {Array(Array(Array(Array(Field))))} - balance tree path elements for each transaction
 * @input accountPathElements[nTxs][2][balanceLevels][1] - {Array(Array(Array(Array(Field))))} - account tree path elements for each transaction
 * @input orderRoots[nTxs][2] - {Array(Field)} - order roots for order maker taker account 
 * @input oldAccountRoots[nTxs] - {Array(Field)} - initial account state root for each transaction 
 * @input newAccountRoots[nTxs] - {Array(Field)} - final account state root for each transaction
 */
template Block(nTxs, balanceLevels, orderLevels, accountLevels) {

    // public inputs
    // TODO: replace all the public inputs with sha3 hash later
    signal input oldRoot;
    signal input newRoot;
    signal input txDataHashHi;
    signal input txDataHashLo;

    // transactions
    signal input txsType[nTxs];
    signal input encodedTxs[nTxs][ TxLength()];

    // State
    signal input balancePathElements[nTxs][4][balanceLevels][1]; // index meanings: [tx idx][sender, receiver, sender, receiver][levels][siblings]
    signal input orderPathElements[nTxs][2][orderLevels][1]; // index meanings: [tx idx][orderAccount1, orderAccount2][levels][siblings]
    signal input accountPathElements[nTxs][2][accountLevels][1]; // index meanings: [tx idx][sender, receiver][levels][siblings]

    // roots
    signal input orderRoots[nTxs][2];
    signal input oldAccountRoots[nTxs];
    signal input newAccountRoots[nTxs];


    oldAccountRoots[0] === oldRoot;
    newAccountRoots[nTxs - 1] === newRoot;

    // thisOldRoot === lastNewRoot
    for (var i = 1; i < nTxs; i++) {
        oldAccountRoots[i] === newAccountRoots[i-1];
    }

    // decode each transaction
    component decodedTx[nTxs];
    for (var i = 0; i < nTxs; i++) {
        decodedTx[i] = DecodeTx();
        for (var j = 0; j < TxLength(); j++) {
            decodedTx[i].in[j] <== encodedTxs[i][j];
        }
    }   

    component genesisOrderRoot = CalculateGenesisOrderRoot(orderLevels);

    // check transaction type
    component enableDeposit[nTxs];
    component enableTransfer[nTxs];
    component enableWithdraw[nTxs];
    component enableSpotTrade[nTxs];
    for (var i = 0; i < nTxs; i++) {
        enableDeposit[i] = IsEqual();
        enableDeposit[i].in[0] <== txsType[i];
        enableDeposit[i].in[1] <== TxTypeDeposit();

        enableTransfer[i] = IsEqual();
        enableTransfer[i].in[0] <== txsType[i];
        enableTransfer[i].in[1] <== TxTypeTransfer();

        enableWithdraw[i] = IsEqual();
        enableWithdraw[i].in[0] <== txsType[i];
        enableWithdraw[i].in[1] <== TxTypeWithdraw();

        enableSpotTrade[i] = IsEqual();
        enableSpotTrade[i].in[0] <== txsType[i];
        enableSpotTrade[i].in[1] <== TxTypeSpotTrade();
    }

    // data avaliability
    component encodeData[nTxs];
    for (var i = 0; i < nTxs; i++) {
        encodeData[i] = EncodeData(balanceLevels, orderLevels, accountLevels);
        
    encodeData[i].accountID1 <== encodedTxs[i][1];
    encodeData[i].accountID2 <== encodedTxs[i][8];
    encodeData[i].tokenID1 <== encodedTxs[i][2];
    encodeData[i].tokenID2 <== encodedTxs[i][9];
    encodeData[i].amount <== encodedTxs[i][24];
    encodeData[i].newOrder1TokenSell <== encodedTxs[i][39];
    encodeData[i].newOrder2TokenSell <== encodedTxs[i][53];
    encodeData[i].newOrder1AmountSell <== encodedTxs[i][41];
    encodeData[i].newOrder1AmountBuy <== encodedTxs[i][44];
    encodeData[i].order1Pos <== encodedTxs[i][29];
    encodeData[i].newOrder1ID <== encodedTxs[i][38];
    encodeData[i].newOrder2AmountSell <== encodedTxs[i][55];
    encodeData[i].newOrder2AmountBuy <== encodedTxs[i][58];
    encodeData[i].order2Pos <== encodedTxs[i][30];
    encodeData[i].newOrder2ID <== encodedTxs[i][52];
    encodeData[i].sign2 <== encodedTxs[i][11];
    encodeData[i].ay2 <== encodedTxs[i][12];

        encodeData[i].isDeposit <== enableDeposit[i].out;
        encodeData[i].isTransfer <== enableTransfer[i].out;
        encodeData[i].isWithdraw <== enableWithdraw[i].out;
        encodeData[i].isSpotTrade <== enableSpotTrade[i].out;
        encodeData[i].order1Unfilled <== (decodedTx[i].newOrder1AmountBuy - decodedTx[i].newOrder1FilledBuy) * (decodedTx[i].newOrder1AmountSell - decodedTx[i].newOrder1FilledSell);
        encodeData[i].order2Unfilled <== (decodedTx[i].newOrder2AmountBuy - decodedTx[i].newOrder2FilledBuy) * (decodedTx[i].newOrder2AmountSell - decodedTx[i].newOrder2FilledSell);
        encodeData[i].isL2KeyUpdated <== decodedTx[i].dstIsNew;        
    }

    var txBits = TxDataLength(balanceLevels, orderLevels, accountLevels);
    component txDataHasher = Sha256ToNum(nTxs *txBits);
    for (var i = 0; i < nTxs; i++) {
        for (var j = 0; j < txBits; j++) {
            encodeData[i].encodedTxData[j] ==> txDataHasher.bits[i*txBits + j];
        }
    }
    txDataHasher.hashOutHi === txDataHashHi;
    txDataHasher.hashOutLo === txDataHashLo;    

    // universal check
    component balanceChecker1[nTxs];
    component balanceChecker2[nTxs];
    component sigChecker1[nTxs];
    component sigChecker2[nTxs];

    // process each transaction
    component processDeposit[nTxs];
    component processTransfer[nTxs];
    component processWithdraw[nTxs];
    component processSpotTrade[nTxs];

    for (var i = 0; i < nTxs; i++) {

        // universal check
        balanceChecker1[i] = BalanceChecker(balanceLevels, accountLevels);
        balanceChecker1[i].enabled <== decodedTx[i].enableBalanceCheck1;
        balanceChecker1[i].accountRoot <== oldAccountRoots[i];
        balanceChecker1[i].orderRoot <== orderRoots[i][0];
        balanceChecker1[i].tokenID <== decodedTx[i].tokenID1;

        balanceChecker1[i].accountID <== decodedTx[i].accountID1;
        balanceChecker1[i].sign <== decodedTx[i].sign1;
        balanceChecker1[i].ay <== decodedTx[i].ay1;
        balanceChecker1[i].nonce <== decodedTx[i].nonce1;
        balanceChecker1[i].balance <== decodedTx[i].balance1;

        for (var j = 0; j < balanceLevels; j++) {
            balanceChecker1[i].balancePathElements[j][0] <== balancePathElements[i][0][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            balanceChecker1[i].accountPathElements[j][0] <== accountPathElements[i][0][j][0];
        }

        balanceChecker2[i] = BalanceChecker(balanceLevels, accountLevels);
        balanceChecker2[i].enabled <== decodedTx[i].enableBalanceCheck2;
        balanceChecker2[i].accountRoot <== newAccountRoots[i];
        balanceChecker2[i].orderRoot <== orderRoots[i][1];
        balanceChecker2[i].tokenID <== decodedTx[i].tokenID2;

        balanceChecker2[i].accountID <== decodedTx[i].accountID2;
        balanceChecker2[i].sign <== decodedTx[i].sign2;
        balanceChecker2[i].ay <== decodedTx[i].ay2;
        balanceChecker2[i].nonce <== decodedTx[i].nonce2;
        balanceChecker2[i].balance <== decodedTx[i].balance2;

        for (var j = 0; j < balanceLevels; j++) {
            balanceChecker2[i].balancePathElements[j][0] <== balancePathElements[i][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            balanceChecker2[i].accountPathElements[j][0] <== accountPathElements[i][1][j][0];
        }

        sigChecker1[i] = SigChecker();
        sigChecker1[i].enabled <== decodedTx[i].enableSigCheck1;
        
        sigChecker1[i].sigL2Hash <== decodedTx[i].sigL2Hash1;
        sigChecker1[i].s <== decodedTx[i].s1;
        sigChecker1[i].r8x <== decodedTx[i].r8x1;
        sigChecker1[i].r8y <== decodedTx[i].r8y1;
        sigChecker1[i].ay <== decodedTx[i].ay1;
        sigChecker1[i].sign <== decodedTx[i].sign1;

        sigChecker2[i] = SigChecker();
        sigChecker2[i].enabled <== decodedTx[i].enableSigCheck2;
        
        sigChecker2[i].sigL2Hash <== decodedTx[i].sigL2Hash2;
        sigChecker2[i].s <== decodedTx[i].s2;
        sigChecker2[i].r8x <== decodedTx[i].r8x2;
        sigChecker2[i].r8y <== decodedTx[i].r8y2;
        sigChecker2[i].ay <== decodedTx[i].ay2;
        sigChecker2[i].sign <== decodedTx[i].sign2;




        // try process deposit
        processDeposit[i] = Deposit(balanceLevels, accountLevels);
        processDeposit[i].enabled <== enableDeposit[i].out;
        processDeposit[i].genesisOrderRoot <== genesisOrderRoot.root;
        processDeposit[i].orderRoot1 <== orderRoots[i][0];
        processDeposit[i].orderRoot2 <== orderRoots[i][1];

        
        processDeposit[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processDeposit[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processDeposit[i].amount <== decodedTx[i].amount;
        processDeposit[i].balance1 <== decodedTx[i].balance1;
        processDeposit[i].nonce1 <== decodedTx[i].nonce1;
        processDeposit[i].sign1 <== decodedTx[i].sign1;
        processDeposit[i].ay1 <== decodedTx[i].ay1;
        processDeposit[i].balance2 <== decodedTx[i].balance2;
        processDeposit[i].nonce2 <== decodedTx[i].nonce2;
        processDeposit[i].sign2 <== decodedTx[i].sign2;
        processDeposit[i].ay2 <== decodedTx[i].ay2;
        processDeposit[i].dstIsNew <== decodedTx[i].dstIsNew;


        // try process transfer
        processTransfer[i] = Transfer(balanceLevels, accountLevels);
        processTransfer[i].enabled <== enableTransfer[i].out;
        processTransfer[i].genesisOrderRoot <== genesisOrderRoot.root;

        
        processTransfer[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processTransfer[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processTransfer[i].enableSigCheck1 <== decodedTx[i].enableSigCheck1;
        processTransfer[i].amount <== decodedTx[i].amount;
        processTransfer[i].balance1 <== decodedTx[i].balance1;
        processTransfer[i].nonce1 <== decodedTx[i].nonce1;
        processTransfer[i].sign1 <== decodedTx[i].sign1;
        processTransfer[i].ay1 <== decodedTx[i].ay1;
        processTransfer[i].balance2 <== decodedTx[i].balance2;
        processTransfer[i].nonce2 <== decodedTx[i].nonce2;
        processTransfer[i].sign2 <== decodedTx[i].sign2;
        processTransfer[i].ay2 <== decodedTx[i].ay2;
        processTransfer[i].sigL2Hash1 <== decodedTx[i].sigL2Hash1;
        processTransfer[i].dstIsNew <== decodedTx[i].dstIsNew;


        processTransfer[i].fromAccountID <== decodedTx[i].accountID1;
        processTransfer[i].toAccountID <== decodedTx[i].accountID2;
        processTransfer[i].tokenID <== decodedTx[i].tokenID1;

        processTransfer[i].orderRoot1 <== orderRoots[i][0];
        processTransfer[i].orderRoot2 <== orderRoots[i][1];
        for (var j = 0; j < balanceLevels; j++) {
            processTransfer[i].senderBalancePathElements[j][0] <== balancePathElements[i][0][j][0];
            processTransfer[i].receiverBalancePathElements[j][0] <== balancePathElements[i][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processTransfer[i].senderAccountPathElements[j][0] <== accountPathElements[i][0][j][0];
            processTransfer[i].receiverAccountPathElements[j][0] <== accountPathElements[i][1][j][0];
        }
        processTransfer[i].oldAccountRoot <== oldAccountRoots[i];
        processTransfer[i].newAccountRoot <== newAccountRoots[i];

        // try process withdraw
        processWithdraw[i] = Withdraw(balanceLevels, accountLevels);
        processWithdraw[i].enabled <== enableWithdraw[i].out;

        
        processWithdraw[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processWithdraw[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processWithdraw[i].enableSigCheck1 <== decodedTx[i].enableSigCheck1;
        processWithdraw[i].amount <== decodedTx[i].amount;
        processWithdraw[i].balance1 <== decodedTx[i].balance1;
        processWithdraw[i].balance2 <== decodedTx[i].balance2;
        processWithdraw[i].sigL2Hash1 <== decodedTx[i].sigL2Hash1;
        processWithdraw[i].ay1 <== decodedTx[i].ay1;
        processWithdraw[i].sign1 <== decodedTx[i].sign1;
        processWithdraw[i].nonce1 <== decodedTx[i].nonce1;
        processWithdraw[i].ay2 <== decodedTx[i].ay2;
        processWithdraw[i].sign2 <== decodedTx[i].sign2;
        processWithdraw[i].nonce2 <== decodedTx[i].nonce2;
  
        processWithdraw[i].orderRoot1 <== orderRoots[i][0];
        processWithdraw[i].orderRoot2 <== orderRoots[i][1];    

        // try spot trade
        processSpotTrade[i] = SpotTrade(balanceLevels, orderLevels, accountLevels);
        processSpotTrade[i].enabled <== enableSpotTrade[i].out;

        
        processSpotTrade[i].oldOrder1ID <== decodedTx[i].oldOrder1ID;
        processSpotTrade[i].oldOrder1TokenSell <== decodedTx[i].oldOrder1TokenSell;
        processSpotTrade[i].oldOrder1FilledSell <== decodedTx[i].oldOrder1FilledSell;
        processSpotTrade[i].oldOrder1AmountSell <== decodedTx[i].oldOrder1AmountSell;
        processSpotTrade[i].oldOrder1TokenBuy <== decodedTx[i].oldOrder1TokenBuy;
        processSpotTrade[i].oldOrder1FilledBuy <== decodedTx[i].oldOrder1FilledBuy;
        processSpotTrade[i].oldOrder1AmountBuy <== decodedTx[i].oldOrder1AmountBuy;
        processSpotTrade[i].newOrder1ID <== decodedTx[i].newOrder1ID;
        processSpotTrade[i].newOrder1TokenSell <== decodedTx[i].newOrder1TokenSell;
        processSpotTrade[i].newOrder1FilledSell <== decodedTx[i].newOrder1FilledSell;
        processSpotTrade[i].newOrder1AmountSell <== decodedTx[i].newOrder1AmountSell;
        processSpotTrade[i].newOrder1TokenBuy <== decodedTx[i].newOrder1TokenBuy;
        processSpotTrade[i].newOrder1FilledBuy <== decodedTx[i].newOrder1FilledBuy;
        processSpotTrade[i].newOrder1AmountBuy <== decodedTx[i].newOrder1AmountBuy;
        processSpotTrade[i].oldOrder2ID <== decodedTx[i].oldOrder2ID;
        processSpotTrade[i].oldOrder2TokenSell <== decodedTx[i].oldOrder2TokenSell;
        processSpotTrade[i].oldOrder2FilledSell <== decodedTx[i].oldOrder2FilledSell;
        processSpotTrade[i].oldOrder2AmountSell <== decodedTx[i].oldOrder2AmountSell;
        processSpotTrade[i].oldOrder2TokenBuy <== decodedTx[i].oldOrder2TokenBuy;
        processSpotTrade[i].oldOrder2FilledBuy <== decodedTx[i].oldOrder2FilledBuy;
        processSpotTrade[i].oldOrder2AmountBuy <== decodedTx[i].oldOrder2AmountBuy;
        processSpotTrade[i].newOrder2ID <== decodedTx[i].newOrder2ID;
        processSpotTrade[i].newOrder2TokenSell <== decodedTx[i].newOrder2TokenSell;
        processSpotTrade[i].newOrder2FilledSell <== decodedTx[i].newOrder2FilledSell;
        processSpotTrade[i].newOrder2AmountSell <== decodedTx[i].newOrder2AmountSell;
        processSpotTrade[i].newOrder2TokenBuy <== decodedTx[i].newOrder2TokenBuy;
        processSpotTrade[i].newOrder2FilledBuy <== decodedTx[i].newOrder2FilledBuy;
        processSpotTrade[i].newOrder2AmountBuy <== decodedTx[i].newOrder2AmountBuy;
        processSpotTrade[i].enableBalanceCheck1 <== decodedTx[i].enableBalanceCheck1;
        processSpotTrade[i].enableBalanceCheck2 <== decodedTx[i].enableBalanceCheck2;
        processSpotTrade[i].enableSigCheck1 <== decodedTx[i].enableSigCheck1;
        processSpotTrade[i].enableSigCheck2 <== decodedTx[i].enableSigCheck2;
        processSpotTrade[i].tokenID1 <== decodedTx[i].tokenID1;
        processSpotTrade[i].tokenID2 <== decodedTx[i].tokenID2;

        
        processSpotTrade[i].order1Pos <== decodedTx[i].order1Pos;
        processSpotTrade[i].order1AccountID <== decodedTx[i].accountID1;
        processSpotTrade[i].order1AccountNonce <== decodedTx[i].nonce1;
        processSpotTrade[i].order1AccountSign <== decodedTx[i].sign1;
        processSpotTrade[i].order1AccountAy <== decodedTx[i].ay1;
        processSpotTrade[i].order2Pos <== decodedTx[i].order2Pos;
        processSpotTrade[i].order2AccountID <== decodedTx[i].accountID2;
        processSpotTrade[i].order2AccountNonce <== decodedTx[i].nonce2;
        processSpotTrade[i].order2AccountSign <== decodedTx[i].sign2;
        processSpotTrade[i].order2AccountAy <== decodedTx[i].ay2;

        processSpotTrade[i].amount1to2 <== decodedTx[i].amount1;
        processSpotTrade[i].amount2to1 <== decodedTx[i].amount2;
        processSpotTrade[i].order1TokenSellBalance <== decodedTx[i].balance1;
        // for reusing universal checker, balance2 here must be a leaf of the final merkle tree
        processSpotTrade[i].order2TokenBuyBalance <== decodedTx[i].balance2 - decodedTx[i].amount1;
        processSpotTrade[i].order2TokenSellBalance <== decodedTx[i].balance3;
        processSpotTrade[i].order1TokenBuyBalance <== decodedTx[i].balance4 - decodedTx[i].amount2;

        
        processSpotTrade[i].orderRoot1 <== orderRoots[i][0];
        processSpotTrade[i].orderRoot2 <== orderRoots[i][1];

        for (var j = 0; j < orderLevels; j++) {
            processSpotTrade[i].orderPathElements[0][j][0] <== orderPathElements[i][0][j][0];
            processSpotTrade[i].orderPathElements[1][j][0] <== orderPathElements[i][1][j][0];
        }
        for (var j = 0; j < balanceLevels; j++) {
            processSpotTrade[i].oldAccount1BalancePathElements[j][0] <== balancePathElements[i][0][j][0];
            processSpotTrade[i].tmpAccount1BalancePathElements[j][0] <== balancePathElements[i][3][j][0];
            processSpotTrade[i].oldAccount2BalancePathElements[j][0] <== balancePathElements[i][2][j][0];
            processSpotTrade[i].tmpAccount2BalancePathElements[j][0] <== balancePathElements[i][1][j][0];
        }
        for (var j = 0; j < accountLevels; j++) {
            processSpotTrade[i].oldAccount1PathElements[j][0] <== accountPathElements[i][0][j][0];
            processSpotTrade[i].tmpAccount2PathElements[j][0] <== accountPathElements[i][1][j][0];
        }
        processSpotTrade[i].oldAccountRoot <== oldAccountRoots[i];
        processSpotTrade[i].newAccountRoot <== newAccountRoots[i];

    }
}
