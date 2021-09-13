include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

//this is a work-around for handling the issue of circom, see https://github.com/fluidex/circom-plus/issues/4
function dummyN(n) {
    var doubleN = n * 2;
    return doubleN >> 1;
}

/**
 * Improve the sha256 circuit from circomlib, made the calculated bits aligned at 8-bit 
 * and output integer as result instead of 256 bits
 * @input bits - {Field} - one bit of the encoded txdata
 * @output 
 *  hashOutHi - {Uint128} - significant part of the resulting bytes as a big-endian, 256bit integer 
 *  hashOutLo - {Uint128} - less significant part of the resulting bytes
 */

template Sha256ToNum(nBitsIn) {

    var nBits = dummyN(nBitsIn);

    signal input bits[nBits];
    //ff we common used has ~254 bit for expressing ineger so we have to
    //divide uint256 into two parts
    //NOTICE: do not use FF whose order is less than 2^129
    signal output hashOutHi;
    signal output hashOutLo;

    var bitPadding = 8 - nBits % 8;
    if (bitPadding == 8){
        bitPadding = 0;
    }

    var hashBits = nBits + bitPadding;
    component hasher = Sha256(hashBits);

    for (var i = 0; i < nBits; i++){
        hasher.in[i] <== bits[i];
    }
    
    for (var i = nBits; i < hashBits; i++){
        hasher.in[i] <== 0;
    }

    var lc1= 0;
    var e2 = 1;
    for (var i = 31; i >= 16; i--){
        for (var j = 7; j >= 0; j--) {
            lc1 += hasher.out[i*8+j] * e2;
            e2 = e2 + e2;
        }
    }
    lc1 ==> hashOutLo;

    lc1 = 0;
    e2 = 1;
    for (var i = 15; i >= 0; i--){
        for (var j = 7; j >= 0; j--) {
            lc1 += hasher.out[i*8+j] * e2;
            e2 = e2 + e2;
        }
    }

    lc1 ==> hashOutHi;
}
