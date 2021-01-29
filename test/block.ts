import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';

// circuit-level definitions
const nTxs = 2;
const balanceLevels = 2;
const accountLevels = 2;

function initTestCase() {
	return {
	};
}

let test_case = initTestCase();
class TestBlock implements SimpleTest {
	getInput() {
		return {};
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
