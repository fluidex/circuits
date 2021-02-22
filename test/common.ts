import { hash } from '../helper.ts/hash';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  DepositToNew,
  DepositToOld,
  Transfer,
  Withdraw,
}

const TxLength = 18;
enum TxDetailIdx {
  TokenID,
  Amount,
  AccountID1,
  AccountID2,
  EthAddr1,
  EthAddr2,
  Sign1,
  Sign2,
  Ay1,
  Ay2,
  Nonce1,
  Nonce2,
  Balance1,
  Balance2,
  SigL2Hash,
  S,
  R8x,
  R8y,
}

function getBTreeProof(leaves, index) {
  // TODO: assert even length
  // TODO: check index bounds

  let tmpLeaves = leaves;
  let path_elements = [];

  while (tmpLeaves.length != 1) {
    if (index % 2 == 0) {
      path_elements.push([tmpLeaves[index + 1]]);
    } else {
      path_elements.push([tmpLeaves[index - 1]]);
    }

    let tempMidLeaves = [];
    for (let i = 0; i + 1 < tmpLeaves.length; i += 2) {
      tempMidLeaves.push(hash([tmpLeaves[i], tmpLeaves[i + 1]]));
    }
    tmpLeaves = tempMidLeaves;
    index = Math.trunc(index / 2);
  }

  return {
    root: tmpLeaves[0],
    path_elements: path_elements,
  };
}

export { TxType, TxLength, TxDetailIdx, getBTreeProof };
