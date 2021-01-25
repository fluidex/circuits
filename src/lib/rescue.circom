include "./rescue_constants.circom";

template Pow5() {
    signal input in;
    signal output out;
    signal in2;
    signal in4;
    in2 <== in*in;
    in4 <== in2*in2;
    out <== in4*in;
}

template InvPow5() {
    signal input in;
    signal output out;
    component pow5;
    pow5 = Pow5();
    pow5.in <-- in ** 17510594297471420177797124596205820070838691520332827474958563349260646796493; // inv 5
    pow5.out === in;
    out <== pow5.in;
}

template AddVec(STATE_WIDTH, R, idx) {
    signal input in[STATE_WIDTH];
    signal output out[STATE_WIDTH];

    for (var i=0; i<STATE_WIDTH; i++) {
        out[i] <== in[i] + R[idx][i];
    }
}

template MulMatrix(STATE_WIDTH, M) {
    signal input in[STATE_WIDTH];
    signal output out[STATE_WIDTH];

    var lc;
    for (var i=0; i<STATE_WIDTH; i++) {
        lc = 0;
        for (var j=0; j<STATE_WIDTH; j++) {
            lc += M[i][j]*in[j];
        }
        out[i] <== lc;
    }
}

template RescueMimc() {
    // input can only be of size 3
    signal input inputs[3];
    signal output outputs[3];
    var STATE_WIDTH = 3;
    var ROUND = 22;
    var loop = ROUND;
    var R[1 + 2 * ROUND][STATE_WIDTH] = RESCUE_ROUND();
    var M[STATE_WIDTH][STATE_WIDTH] = RESCUE_MATRIX();

    component addFirst;

    signal inner[6 * ROUND + 1][STATE_WIDTH];
    component adds[ROUND][2];
    component muls[ROUND][2];
    component pow[ROUND][STATE_WIDTH];
    component invpow[ROUND][STATE_WIDTH];
    // first add
    addFirst = AddVec(STATE_WIDTH, R, 0);
    for(var j = 0; j < STATE_WIDTH; j++) {
        addFirst.in[j] <== inputs[j];
    }
    for (var j=0; j<STATE_WIDTH; j++) {
        inner[0][j] <== addFirst.out[j];
    }
    for(var i = 0; i < loop; i++) {
        // pow five inv
        for(var j = 0; j < STATE_WIDTH; j++) {
            invpow[i][j] = InvPow5();
            invpow[i][j].in <== inner[i * 6][j]
            inner[i * 6 + 1][j] <== invpow[i][j].out;
        }
        // mul
        muls[i][0] = MulMatrix(STATE_WIDTH, M);
        for(var j = 0; j < STATE_WIDTH; j++) {
            muls[i][0].in[j] <== inner[i * 6 + 1][j];
        }
        for(var j = 0; j < STATE_WIDTH; j++) {
            inner[i * 6 + 2][j] <== muls[i][0].out[j];
        }
        // add
        adds[i][0] = AddVec(STATE_WIDTH, R, i * 2 + 1);
        for(var j = 0; j < STATE_WIDTH; j++) {
            adds[i][0].in[j] <== inner[i * 6 + 2][j];
        }
        for(var j = 0; j < STATE_WIDTH; j++) {
            inner[i * 6 + 3][j] <== adds[i][0].out[j];
        }
        // pow five
        for(var j = 0; j < STATE_WIDTH; j++) {
            pow[i][j] = Pow5();
            pow[i][j].in <== inner[i * 6 + 3][j]
            inner[i * 6 + 4][j] <== pow[i][j].out;
        }
        // mul
        muls[i][1] = MulMatrix(STATE_WIDTH, M);
        for(var j = 0; j < STATE_WIDTH; j++) {
            muls[i][1].in[j] <== inner[i * 6 + 4][j];
        }
        for(var j = 0; j < STATE_WIDTH; j++) {
            inner[i * 6 + 5][j] <== muls[i][1].out[j];
        }
        // add
        adds[i][1] = AddVec(STATE_WIDTH, R, i * 2 + 2);
        for(var j = 0; j < STATE_WIDTH; j++) {
            adds[i][1].in[j] <== inner[i * 6 + 5][j];
        }
        for(var j = 0; j < STATE_WIDTH; j++) {
            inner[i * 6 + 6][j] <== adds[i][1].out[j];
        }
    }

    for(var j = 0; j < STATE_WIDTH; j++) {
        outputs[j] <== inner[6 * loop][j];
    }
    
}

template RescueHash(nInputs) {
    signal input inputs[nInputs];
    signal output out;

    var RATE = 2;
    var STATE_WIDTH = 3;
    var cycles = (nInputs + RATE - 1) \ RATE; // Math.ceil
    assert(nInputs <= cycles * RATE)
    component mimcs[cycles];
    signal inner[2 * cycles + 1][STATE_WIDTH];
    for (var j = 0; j < RATE; j++) {
        inner[0][j] <== 0;
    }
    inner[0][RATE] <== nInputs;

    for (var i = 0; i < cycles; i++) {
        var rowIdx = i * 2 + 1;
        for (var j = 0; j < RATE; j++) {
            var idx = i * RATE + j;
            if (idx < nInputs) {
                inner[rowIdx][j] <== inner[rowIdx - 1][j] + inputs[idx];
            } else {
                inner[rowIdx][j] <== inner[rowIdx - 1][j] + 1;
            }
        }
        inner[rowIdx][RATE] <== inner[rowIdx - 1][RATE];
        mimcs[i] = RescueMimc();
        for (var j = 0; j < STATE_WIDTH; j++) {
            mimcs[i].inputs[j] <== inner[rowIdx][j];
        }
        for (var j = 0; j < STATE_WIDTH; j++) {
            inner[rowIdx + 1][j] <== mimcs[i].outputs[j];
        }
    }
    out <== inner[2 * cycles][0];
}