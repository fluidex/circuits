import * as path from 'path';
import { hash } from '../helper.ts/hash';
const Scalar = require('ffjavascript').Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, getGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import { TxType, getBTreeProof } from './common';

// circuit-level definitions
const orderLevels = 2;
const balanceLevels = 2;
const accountLevels = 2;

const genesisOrderRoot = getGenesisOrderRoot();

function initTestCase() {
  return {
  	enabled: 1,
  };
}

let test_case = initTestCase();
class TestSpotTrade implements SimpleTest {
  getInput() {
    return {
      enabled: test_case.enabled,    
    };
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'spot_trade.circom'),
      main: `SpotTrade(${orderLevels}, ${balanceLevels}, ${accountLevels})`,
    };
  }
}

export { TestSpotTrade };
