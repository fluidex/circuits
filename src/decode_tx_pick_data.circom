// This circuit is used for testing decode_tx.circom, some filed in the output of DecodeTx is picked up so test script
// can build test cases more conveniently

include "./decode_tx.circom"

template PickTxDataFromTx(tokenLevels, accountLevels) {
    signal input in[TxLength()];
    signal output txData[TxDataLength(accountLevels, tokenLevels)];
    signal output amount;
    component decoder = DecodeTx(tokenLevels, 0, accountLevels);

    for (var i = 0; i < TxLength(); i++){
        decoder.in[i] <== in[i];
    }

    for (var i = 0; i < TxDataLength(accountLevels, tokenLevels); i++){
        decoder.encodedTxData[i] ==> txData[i];
    }
    decoder.amount ==> amount;
}


template PickTxDataFromTxs(nTxs, tokenLevels, accountLevels) {
    signal input in[nTxs][TxLength()];
    signal output txData[nTxs*TxDataLength(accountLevels, tokenLevels)];
    component decoder[nTxs];

    for (var i = 0; i < nTxs; i++) {
        decoder[i] = DecodeTx(tokenLevels, 0, accountLevels);
        for (var j = 0; j < TxLength(); j++){
            decoder[i].in[j] <== in[i][j];
        }
    }

    var txBits = TxDataLength(accountLevels, tokenLevels);
    for (var i = 0; i < nTxs; i++) {
        for (var j = 0; j < txBits; j++){
            decoder[i].encodedTxData[j] ==> txData[i*txBits + j];
        }
    }
}
