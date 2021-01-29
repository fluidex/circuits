// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  DepositToNew,
  DepositToOld,
  Transfer,
  Withdraw,
}

export { TxType };
