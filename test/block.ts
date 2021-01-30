import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const nTxs = 1;
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

	let txsType :Array<number> = new Array(nTxs); txsType.fill(0, 0, nTxs);
	let encodedTxs = [];
	let balance_path_elements = [];
	let account_path_elements = [];
	let oldAccountRoots = [];
	let newAccountRoots = [];

	let encodedTx :Array<BigInt> = new Array(common.TxLength); encodedTx.fill(0n, 0, common.TxLength);

    // 1st tx: deposit_to_new
    txsType.push(common.TxType.DepositToNew);
    encodedTx[common.TxDetailIdx.TokenID] = Scalar.e(tokenID);
    encodedTx[common.TxDetailIdx.Amount] = 200n;
    encodedTx[common.TxDetailIdx.AccountID2] = Scalar.e(accountID2);
    encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr2NoPrefix, 16);
    encodedTx[common.TxDetailIdx.Sign2] = Scalar.e(account2.sign);
    encodedTx[common.TxDetailIdx.Ay2] = Scalar.fromString(account2.ay, 16);
	encodedTxs.push(encodedTx);


	return {
		txsType: txsType,
		encodedTxs: encodedTxs,
		// balance_path_elements: balance_path_elements,
		// account_path_elements: account_path_elements,
		// oldAccountRoots: oldAccountRoots,
		// newAccountRoots: newAccountRoots,
	};
}

let test_case = initTestCase();
class TestBlock implements SimpleTest {
	getInput() {
		return {
			txsType: test_case.txsType,
			encodedTxs: test_case.encodedTxs,
			// balance_path_elements: test_case.balance_path_elements,
			// account_path_elements: test_case.account_path_elements,
			// oldAccountRoots: test_case.oldAccountRoots,
			// newAccountRoots: test_case.newAccountRoots,
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