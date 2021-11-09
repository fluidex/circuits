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

function fromPubkey(pbk: string): { sign: bigint; ay: bigint } {
  let pbkbuf = Buffer.from(pbk, 'hex');
  pbkbuf.reverse();
  let sign = (pbkbuf[0] & 0x80) === 0 ? BigInt(0) : BigInt(1);
  pbkbuf[0] &= 0x7f;
  return {
    ay: BigInt('0x' + pbkbuf.toString('hex')),
    sign,
  };
}

const accountID1 = BigInt(1);
const accountID2 = BigInt(2);
const accountID3 = BigInt(3);

const testPubkey1 = '5d182c51bcfe99583d7075a7a0c10d96bef82b8a059c4bf8c5f6e7124cf2bba3';
const testPubkey2 = 'e9b54eb2dbf0a14faafd109ea2a6a292b78276c8381f8ef984dddefeafb2deaf';
const testPubkey3 = '5d182c51bcfe99583d7075a7a0c10d96bef82b8a059c4bf8c5f6e7124cf2bba3';

//fake "deposit to new" like what has been done in the rs rollup-manager
state.DepositToNew({
  accountID: accountID1,
  //in 'fake deposit' we use tokeID as 0
  tokenID: BigInt(0),
  amount: BigInt(0),
  ...fromPubkey(testPubkey1),
});

state.DepositToNew({
  accountID: accountID2,
  tokenID: BigInt(0),
  amount: BigInt(0),
  ...fromPubkey(testPubkey2),
});

state.DepositToOld({
  accountID: accountID1,
  tokenID: BigInt(1), //in integration test we specified "USDT" which has a hardcoded id as 1
  amount: BigInt(500_000_000_000),
});

state.Withdraw({
  accountID: accountID1,
  tokenID: BigInt(1),
  amount: BigInt(100_000_000),
  signature:
    'ce6e16056da007b3d7274db0ef3f546a101bd99be4137dfe97340b8f2481caac3a7af82bef9d00c226227280413de24714acd2458ba369d052ea43e0cd063601',
});

state.DepositToNew({
  accountID: accountID3,
  tokenID: BigInt(0),
  amount: BigInt(0),
  ...fromPubkey(testPubkey3),
});

state.DepositToOld({
  accountID: accountID3,
  tokenID: BigInt(0), //in integration test we specified "ETH" which has a hardcoded id as 0
  amount: BigInt(30_000),
});

let blocks = state.forgeAllL2Blocks();
console.log('the merkle root should be asserted as following:');
console.log('block 0:', '0x' + blocks[0].newRoot.toString(16).padStart(64, '0'));
console.log('block 1:', '0x' + blocks[1].newRoot.toString(16).padStart(64, '0'));
console.log('block 2:', '0x' + blocks[2].newRoot.toString(16).padStart(64, '0'));
console.log('block 3:', '0x' + blocks[3].newRoot.toString(16).padStart(64, '0'));
console.log('block 4:', '0x' + blocks[4].newRoot.toString(16).padStart(64, '0'));