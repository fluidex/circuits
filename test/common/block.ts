export class L2Block {
  oldRoot: bigint;
  newRoot: bigint;
  txDataHashHi: bigint;
  txDataHashLo: bigint;
  txsType: Array<any>;
  encodedTxs: Array<any>;
  balancePathElements: Array<any>;
  orderPathElements: Array<any>;
  accountPathElements: Array<any>;
  orderRoots: Array<any>;
  oldAccountRoots: Array<any>;
  newAccountRoots: Array<any>;
}
