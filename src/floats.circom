// Refer to:
// https://github.com/hermeznetwork/circuits/blob/master/src/lib/decode-float.circom

//TODO: later the circuit should be generated from template, so manitisaBits and exponentBits become configurable

include "./lib/bitify.circom";

function manitisaBits() { return 35; }
function exponentBits() { return 5; }

template DecodeFloats() {
    signal input encodedAmount;
    signal output decodedAmount;

    signal m[manitisaBits()];   
    signal e[exponentBits()];    

    var totalBits = manitisaBits() + exponentBits();

    component toBits = Num2Bits(totalBits);
    toBits.in <== encodedAmount;

    signal pe[exponentBits()]; //Intermediary steps for mutiplying 
    pe[0] <== (9 * toBits.out[manitisaBits()]) + 1;
    var i;
    for (i = 1; i < exponentBits(); i++) {
        pe[i] <== (pe[i-1] * (10**(2**i)) - pe[i-1]) * toBits.out[manitisaBits()+i] + pe[i-1];
    }    

    signal scale10;
    scale10 <== pe[exponentBits() - 1];

    var lcm = 0;
    var e2 = 1;
    for (i = 0; i < manitisaBits(); i++) {
        lcm += e2 * toBits.out[i];
        e2 = e2 + e2;
    }

    decodedAmount <== lcm * scale10;    
}
