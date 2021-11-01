include "../../node_modules/circomlib/circuits/bitify.circom";

template Num2BitsIfEnabled(n) {
    signal input in;
    signal input enabled;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    component check = ForceEqualIfEnabled();
    check.enabled <== enabled;
    check.in[0] <== lc1;
    check.in[1] <== in;
}
