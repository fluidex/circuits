import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';

// circuit-level definitions
const nTxs = 4;
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
	const tokenID = 0;

	// oldAccount
	const accountID1 = 2;
	const account1 = new Account(1);
	const ethAddr1NoPrefix = account1.ethAddr.replace('0x', '');
	let balance1 = 300n;
	// newAccount
	const accountID2 = 1;
	const account2 = new Account(2);
	const ethAddr2NoPrefix = account2.ethAddr.replace('0x', '');

    // account1 state
    let account1BalanceLeaves = [];
    for (let i = 0; i < 2**balanceLevels; i++) account1BalanceLeaves.push(10n + BigInt(i));
    // TODO: check index bounds
    account1BalanceLeaves[tokenID] = balance1;
	let account2BalanceLeaves :Array<BigInt> = new Array(2**balanceLevels); account2BalanceLeaves.fill(0n, 0, 2**balanceLevels);

	let txsType :Array<BigInt> = new Array(nTxs); txsType.fill(0n, 0, nTxs);
	let encodedTxs :Array<BigInt> = new Array(nTxs); encodedTxs.fill(0n, 0, nTxs);
	let encodedTx :Array<BigInt> = new Array(common.TxLength); encodedTx.fill(0n, 0, common.TxLength);

    // deposit_to_new
    txsType.push(common.TxType.DepositToNew);
    encodedTx[common.TxDetailIdx.TokenID] = tokenID;
    encodedTx[common.TxDetailIdx.Amount] = 200n;
    encodedTx[common.TxDetailIdx.AccountID2] = accountID2;
    encodedTx[common.TxDetailIdx.EthAddr2] = Scalar.fromString(ethAddr2NoPrefix, 16);
    encodedTx[common.TxDetailIdx.Sign2] = account2.sign;
    encodedTx[common.TxDetailIdx.Ay2] = account2.ay;



	return {
		txsType: txsType,
	};
}

let test_case = initTestCase();
class TestBlock implements SimpleTest {
	getInput() {
		return {
			txsType: test_case.txsType,
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
