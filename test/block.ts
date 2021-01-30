import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const nTxs = 2;
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
    const tokenID = 0;

    // oldAccount
    const accountID1 = 2;
    const account1 = new Account(1);
    const ethAddr1NoPrefix = account1.ethAddr.replace('0x', '');
    let nonce1 = 99; 
    let balance1 = 300n;
    // newAccount
    const accountID2 = 1;
    const account2 = new Account(2);
    const ethAddr2NoPrefix = account2.ethAddr.replace('0x', '');

    // initial account1 state
    let account1BalanceLeaves = [];
    for (let i = 0; i < 2**balanceLevels; i++) account1BalanceLeaves.push(10n + BigInt(i));
    // TODO: check index bounds
    account1BalanceLeaves[tokenID] = balance1;
    let account1BalanceProof = common.getBTreeProof(account1BalanceLeaves, tokenID);
    let account1State = {
        nonce: nonce1,
        sign: account1.sign,
        balanceRoot: account1BalanceProof.root,
        ay: account1.ay,
        ethAddr: ethAddr1NoPrefix,
    };
    let account1Hash = hashAccountState(account1State);

    // initial account2 state
    let account2BalanceLeaves :Array<BigInt> = new Array(2**balanceLevels); account2BalanceLeaves.fill(0n, 0, 2**balanceLevels);
    let account2BalanceProof = common.getBTreeProof(account2BalanceLeaves, tokenID);
    let account2State = {
        nonce: 0,
        sign: 0,
        balanceRoot: account2BalanceProof.root,
        ay: '0',
        ethAddr: '0',
    };
    let account2Hash = hashAccountState(account2State);

    // initial account tree
    let accountLeaves = [];
    for (let i = 0; i < 2**accountLevels; i++) accountLeaves.push(20n + BigInt(i));
    // TODO: check index bounds
    accountLeaves[accountID1] = account1Hash;
    accountLeaves[accountID2] = account2Hash;
    let account1Proof = common.getBTreeProof(accountLeaves, accountID1);
    let account2Proof = common.getBTreeProof(accountLeaves, accountID2);

    let txsType = [];
    let encodedTxs = [];
    let balance_path_elements = [];
    let account_path_elements = [];
    let oldAccountRoots = [];
    let newAccountRoots = [];

    let encodedTx :Array<BigInt> = new Array(common.TxLength); encodedTx.fill(0n, 0, common.TxLength);

    // 1st tx: deposit_to_new
    let amount = 200n;
    txsType.push(common.TxType.DepositToNew);
    encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
    encodedTx[common.TxDetailIdx.Amount] = amount;
    encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID2);
    encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr2NoPrefix, 16);
    encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account2.sign);
    encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account2.ay, 16);
    encodedTxs.push(encodedTx);
    let balance_path_elements_item = new Array(2);
    balance_path_elements_item[0] = account2BalanceProof.path_elements; // whatever
    balance_path_elements_item[1] = account2BalanceProof.path_elements;
    balance_path_elements.push(balance_path_elements_item);
    let account_path_elements_item = new Array(2);
    account_path_elements_item[0] = account2Proof.path_elements; // whatever
    account_path_elements_item[1] = account2Proof.path_elements;
    account_path_elements.push(account_path_elements_item);
    oldAccountRoots.push(account2Proof.root);
    // execute tx
    account2BalanceLeaves[tokenID] = amount;
    account2BalanceProof = common.getBTreeProof(account2BalanceLeaves, tokenID);
    account2State = {
        nonce: 0,
        sign: account2.sign,
        balanceRoot: account2BalanceProof.root,
        ay: account2.ay,
        ethAddr: ethAddr2NoPrefix,
    };
    account2Hash = hashAccountState(account2State);
    accountLeaves[accountID2] = account2Hash;
    account1Proof = common.getBTreeProof(accountLeaves, accountID1);
    account2Proof = common.getBTreeProof(accountLeaves, accountID2);
    newAccountRoots.push(account2Proof.root);

    // 2nd tx: deposit_to_old
    amount = 300n;
    txsType.push(common.TxType.DepositToOld);
    encodedTx = new Array(common.TxLength); encodedTx.fill(0n, 0, common.TxLength);
    encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID1);
    encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
    encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr1NoPrefix, 16);
    encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account1.sign);
    encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account1.ay, 16);
    encodedTx[common.TxDetailIdx.Amount] = amount;
    encodedTx[common.TxDetailIdx.Nonce2] = Scalar.e(account1State.nonce);
    encodedTx[common.TxDetailIdx.Balance2] = Scalar.e(balance1);
    encodedTxs.push(encodedTx);
    balance_path_elements_item = new Array(2);
    balance_path_elements_item[0] = account1BalanceProof.path_elements; // whatever
    balance_path_elements_item[1] = account1BalanceProof.path_elements;
    // console.log(balance_path_elements_item);
    balance_path_elements.push(balance_path_elements_item);
    account_path_elements_item = new Array(2);
    account_path_elements_item[0] = account1Proof.path_elements; // whatever
    account_path_elements_item[1] = account1Proof.path_elements;
    account_path_elements.push(account_path_elements_item);
    oldAccountRoots.push(account1Proof.root);
    // execute tx
    account1BalanceLeaves[tokenID] = balance1 + amount;
    // console.log(account1BalanceProof);
    account1BalanceProof = common.getBTreeProof(account1BalanceLeaves, tokenID);
    // console.log(account1BalanceProof);
    account1State.balanceRoot = account1BalanceProof.root;
    account1Hash = hashAccountState(account1State);
    console.log(accountLeaves);
    accountLeaves[accountID1] = account1Hash;
    console.log(accountLeaves);
    console.log(account1Proof);
    account1Proof = common.getBTreeProof(accountLeaves, accountID1);
    console.log(account1Proof);
    account2Proof = common.getBTreeProof(accountLeaves, accountID2);
    console.log(account2Proof);
    newAccountRoots.push(account1Proof.root);

    // console.log(balance_path_elements[0]);
    // console.log(balance_path_elements[1]);
    // console.log(account_path_elements[0]);
    // console.log(account_path_elements[1]);
    // console.log(oldAccountRoots);
    // console.log(newAccountRoots);

    return {
        txsType: txsType,
        encodedTxs: encodedTxs,
        balance_path_elements: balance_path_elements,
        account_path_elements: account_path_elements,
        oldAccountRoots: oldAccountRoots,
        newAccountRoots: newAccountRoots,
    };
}

let test_case = initTestCase();
class TestBlock implements SimpleTest {
    getInput() {
        return {
            txsType: test_case.txsType,
            encodedTxs: test_case.encodedTxs,
            balance_path_elements: test_case.balance_path_elements,
            account_path_elements: test_case.account_path_elements,
            oldAccountRoots: test_case.oldAccountRoots,
            newAccountRoots: test_case.newAccountRoots,
        };
    }
    getOutput() {
        return {};
    }
    getComponent(): TestComponent {
        return {
            src: path.join(__dirname, '..', 'src', 'block.circom'),
            main: `Block(${nTxs}, ${balanceLevels}, ${accountLevels})`,
        };
    }
}

export { TestBlock };
