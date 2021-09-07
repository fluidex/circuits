
include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

template Sha256ToNum(nBits) {

    signal input bits[nBits];
    signal output hashOut;

    component hasher = Sha256(nBits)

    for (var i = 0; i < nBits; i++){
        hasher.in[i] <== bits[i];
    }

    //here we have a modified version of bits2num, so when the output number
    //turn into bytes array, it would fit with the common expression of the
    //sha256 output (big-endian)

    var lc1=0;
    var e2 = 1;
    for (var i = 31; i >= 0; i--){
        for (var j = 7; j >= 0; j--) {
            lc1 += hasher.out[i*8+j] * e2;
            e2 = e2 + e2;
        }
    }

    lc1 ==> hashOut;
}