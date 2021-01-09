include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/**
 * Convert float16 bits to large integer
 * large integer = (mantissa + 0.5*half_exponent) * 10^exponent
 * [  mantissa   | half_exponent |  exponent  ]
 * [   10 bits   |    1 bits     |   5 bits  ]
 * @input in[16] - {Array[Bool]} - float16 number encoded as binary array
 * @output out - {Field} - large integer
 */
template DecodeFloatBin() {
    signal input in[16];
    signal output out;

    signal m[10];   // Mantisa bits
    signal e[5];    // Exponent bits
    signal d;       // Half digit bit

    signal pe[5];   // Intermediary steps for multiplying the exponents
    signal allow5;  // Allows have digit (exp > 0)
    signal scale10; // 10^exp
    signal scale5;  // scale10/2
    signal outAux;  // Intermediary state for the output

    var i;
    var lcm;

    // Mapping
    d <== in[10]
    for (i = 0; i < 10; i++) m[i] <== in[i];
    for (i = 0; i < 5; i++) e[i] <== in[i+11];

    pe[0] <== (9 * e[0]) + 1;
    for (i = 1; i < 5; i++) {
        pe[i] <== (pe[i-1] * (10**(2**i)) - pe[i-1]) * e[i] + pe[i-1];
    }

    scale10 <== pe[4];

    component isZero = IsZero();

    isZero.in <== e[0] + e[1] + e[2] + e[3] + e[4]

    allow5 <== 1 - isZero.out;

    // NOTE FOR INTERNAL AUDIT:
    // Double check on this assigned signal with no constraints

    scale5 <-- scale10 \ 2;
    scale5 * 2 === scale10 * allow5;

    lcm = 0;
    var e2 = 1;
    for (i = 0; i < 10; i++) {
        lcm += e2 * m[i];
        e2 = e2 + e2;
    }

    outAux <== lcm * scale10;

    out <== outAux + (d * scale5);
}

/**
 * Decode float16 to large integer
 * @input in - {Field} - float16 encode representation
 * @output out - {Field} - large integer
 */
template DecodeFloat() {
    signal input in;
    signal output out;

    component n2b = Num2Bits(16);
    component decoder = DecodeFloatBin();

    n2b.in <== in;

    for (var i=0; i<16; i++) {
        decoder.in[i] <== n2b.out[i];
    }

    decoder.out ==> out;
}
