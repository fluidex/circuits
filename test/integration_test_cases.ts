import { assert } from 'console';
import { GlobalState } from './global_state';

//consistent with .env settings in rollup-state-manager
const nTxs = 2;
const balanceLevels = 3;
const orderLevels = 3;
const accountLevels = 5;

let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs, { verbose: false });

const maxAccountNum = Math.pow(2, accountLevels);
for (let i = 0; i < maxAccountNum; i++) {
  state.createNewAccount({ next_order_id: 1n });
}

function fromPubkey(pbk: string): bigint {
  let pbkbuf = Buffer.from(pbk, 'hex');
  pbkbuf.reverse();
  pbkbuf[0] &= 0x7f;
  return BigInt('0x' + pbkbuf.toString('hex'));
}

//fake "deposit to new" like what has been done in the rs rollup-manager
state.DepositToNew({
  accountID: BigInt(0),
  //in 'fake deposit' we use tokeID as 0
  tokenID: BigInt(0),
  amount: BigInt(0),
  //sign is extracted from pubkey but we do not use it in encoding
  //so just omit it
  sign: BigInt(0),
  ay: fromPubkey('5d182c51bcfe99583d7075a7a0c10d96bef82b8a059c4bf8c5f6e7124cf2bba3'),
});

state.DepositToOld({
  accountID: BigInt(0),
  tokenID: BigInt(0), //in integration test we specified "ETH" which has a hardcoded id as 0
  amount: BigInt(30000),
});

state.DepositToNew({
  accountID: BigInt(1),
  tokenID: BigInt(0),
  amount: BigInt(0),
  sign: BigInt(0),
  ay: fromPubkey('5d182c51bcfe99583d7075a7a0c10d96bef82b8a059c4bf8c5f6e7124cf2bba3'),
});

state.DepositToOld({
  accountID: BigInt(1),
  tokenID: BigInt(0), //in integration test we specified "ETH" which has a hardcoded id as 0
  amount: BigInt(30000),
});

let blocks = state.forgeAllL2Blocks();
console.log('the merkle root should be asserted as following:');
console.log('block 0:', '0x' + blocks[0].newRoot.toString(16));
console.log('block 1:', '0x' + blocks[1].newRoot.toString(16));
