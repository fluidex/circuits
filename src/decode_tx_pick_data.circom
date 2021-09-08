//The circuit used for testing decode_tx.circom, some filed in the output of DecodeTx is picked up so test script
//can build test cases more convenient

include "./decode_tx.circom"

template PickTxDataFromTx(tokenLevels, accountLevels) {
    signal input in[TxLength()];
    signal output txData[TxDataLength(accountLevels, tokenLevels)];
    component decoder = DecodeTx(tokenLevels, 0, accountLevels);

    for (var i = 0; i < TxLength(); i++){
        decoder.in[i] <== in[i];
    }

    for (var i = 0; i < TxDataLength(accountLevels, tokenLevels); i++){
        decoder.encodedTxData[i] ==> txData[i];
    }
}