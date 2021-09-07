// Generated from tpl\\ejs\\src\\hash_txdata.circom.ejs. Don't modify this file manually

include "./lib/sha256.circom";


//currently only the least packing for transfer tx ...
//so accountID * 2 + tokenID + amount

function TxDataLength(accountLevels, tokenLevels) { return accountLevels * 2 + tokenLevels + 40; }
function FloatLength() { return 40;}


/**
 * Computes the sha256 hash for encoding txdata which would be put on chain for data avaliability
 * DA Hash = Sha256(encodedTxData_1 + encodedTxData_2 + ... + encodedTxData_nTxs)
 * encodedTxData: the encoded part of a transaction for DA 
 * nTxs: number of transactions in rollup batch
 * @input bits - {Field} - one bit of the encoded txdata
 * @output hash - {Uint256} - resulting 256bit sha256 hash expressed by big-endian integer
 */

template HashTxDataForDA(nTxs, accountLevels, tokenLevels) {

    var totalBits = nTxs * TxDataLength(accountLevels, tokenLevels); 

    signal input bits[totalBits];
    signal output hashOutHi;
    signal output hashOutLo;

    var bitPadding = 8 - totalBits % 8;
    if (bitPadding == 8){
        bitPadding = 0;
    }

    //need to padd input bits in bytes-edge so the byte-base SHA256 in EVM
    //can obtain same hash
    component hasher = Sha256ToNum(totalBits + bitPadding)

    for (var i = 0; i < totalBits; i++){
        hasher.bits[i] <== bits[i];
    }

    for (var i = totalBits; i < totalBits + bitPadding; i++){
        hasher.bits[i] <== 0;
    }
    
    hasher.hashOutHi ==> hashOutHi;    
    hasher.hashOutLo ==> hashOutLo;    
}