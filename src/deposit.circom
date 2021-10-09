// Generated from tpl/ejs/src/deposit.circom.ejs. Don't modify this file manually
include "./lib/bitify.circom";
include "./lib/hash_state.circom";
include "./lib/binary_merkle_tree.circom";

/**
 * Process a deposit and create account transaction, also support create 0 balance account
 * @param balanceLevels - balance tree depth
 * @param accountLevels - account tree depth
 * @input amount - {Uint192} - amount to deposit from L1 to L2
 */
template Deposit(balanceLevels, accountLevels) {
    signal input enabled;
    signal input enableBalanceCheck1;
    signal input enableBalanceCheck2;

    signal input dstIsNew;
    signal dstIsOld;

    // should only be calculated from the main circuit itself
    signal input genesisOrderRoot;

    // check old account is empty
    signal input orderRoot1;
    signal input orderRoot2;

    signal input balance1;
    signal input nonce1;
    signal input sign1;
    signal input ay1;

    signal input balance2;
    signal input nonce2;
    signal input sign2;
    signal input ay2;

    signal input amount;

    component not = NOT();
    not.in <== dstIsNew;
    not.out ==> dstIsOld;

    component depositToNewCheck = AND();
    depositToNewCheck.a <== enabled;
    depositToNewCheck.b <== dstIsNew;
    component depositToOldCheck = AND();
    depositToOldCheck.a <== enabled;
    depositToOldCheck.b <== dstIsOld;

    // universal checker
    

    component checkEqCheckUniversal0 = ForceEqualIfEnabled();
    checkEqCheckUniversal0.enabled <== enabled;
    checkEqCheckUniversal0.in[0] <== enableBalanceCheck1;
    checkEqCheckUniversal0.in[1] <== 1;

    component checkEqCheckUniversal1 = ForceEqualIfEnabled();
    checkEqCheckUniversal1.enabled <== enabled;
    checkEqCheckUniversal1.in[0] <== enableBalanceCheck2;
    checkEqCheckUniversal1.in[1] <== 1;

    component checkEqCheckUniversal2 = ForceEqualIfEnabled();
    checkEqCheckUniversal2.enabled <== enabled;
    checkEqCheckUniversal2.in[0] <== balance2;
    checkEqCheckUniversal2.in[1] <== balance1 + amount;

    component checkEqCheckUniversal3 = ForceEqualIfEnabled();
    checkEqCheckUniversal3.enabled <== enabled;
    checkEqCheckUniversal3.in[0] <== nonce1;
    checkEqCheckUniversal3.in[1] <== nonce2;

    component checkEqCheckUniversal4 = ForceEqualIfEnabled();
    checkEqCheckUniversal4.enabled <== enabled;
    checkEqCheckUniversal4.in[0] <== orderRoot1;
    checkEqCheckUniversal4.in[1] <== orderRoot2;



    // check state when old state is empty
    

    component checkEqCheckWhenEmpty0 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty0.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty0.in[0] <== balance1;
    checkEqCheckWhenEmpty0.in[1] <== 0;

    component checkEqCheckWhenEmpty1 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty1.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty1.in[0] <== nonce1;
    checkEqCheckWhenEmpty1.in[1] <== 0;

    component checkEqCheckWhenEmpty2 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty2.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty2.in[0] <== ay1;
    checkEqCheckWhenEmpty2.in[1] <== 0;

    component checkEqCheckWhenEmpty3 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty3.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty3.in[0] <== sign1;
    checkEqCheckWhenEmpty3.in[1] <== 0;

    component checkEqCheckWhenEmpty4 = ForceEqualIfEnabled();
    checkEqCheckWhenEmpty4.enabled <== depositToNewCheck.out;
    checkEqCheckWhenEmpty4.in[0] <== orderRoot1;
    checkEqCheckWhenEmpty4.in[1] <== genesisOrderRoot;




    // check state when old state is not empty
    

    component checkEqCheckWhenNotEmpty0 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty0.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty0.in[0] <== nonce1;
    checkEqCheckWhenNotEmpty0.in[1] <== nonce2;

    component checkEqCheckWhenNotEmpty1 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty1.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty1.in[0] <== sign1;
    checkEqCheckWhenNotEmpty1.in[1] <== sign2;

    component checkEqCheckWhenNotEmpty2 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty2.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty2.in[0] <== ay1;
    checkEqCheckWhenNotEmpty2.in[1] <== ay2;

    component checkEqCheckWhenNotEmpty3 = ForceEqualIfEnabled();
    checkEqCheckWhenNotEmpty3.enabled <== depositToOldCheck.out;
    checkEqCheckWhenNotEmpty3.in[0] <== orderRoot1;
    checkEqCheckWhenNotEmpty3.in[1] <== orderRoot2;



    // TODO: underflow check

    // TODO: overflow check

    // TODO: fee
}
