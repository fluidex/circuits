import {config, encodeFloat} from '../codec/float'
import {Hash} from 'fast-sha256'
import {encodeCtx} from '../codec/bitstream'
import * as tx from './tx'

class DA_Hasher extends encodeCtx {

    private nAccountLevel : number;
    private nTokenLevel : number;
    private _hasDigested: boolean;

    constructor(nAccountLevel){
        super()
        this.nAccountLevel = nAccountLevel
        this.nTokenLevel = 16
    }

    encodeTransfer(tx: tx.TranferTx, ctx: encodeCtx) {
        ctx.encodeNumber(Number(tx.from), this.nAccountLevel);
        ctx.encodeNumber(Number(tx.to), this.nAccountLevel);
        ctx.encodeNumber(Number(tx.tokenID), this.nTokenLevel);
        ctx.encodeNumber(Number(encodeFloat(tx.amount)), config.floatLength)
    }

    encodeDeposit(tx: tx.DepositToOldTx | tx.DepositToNewTx, ctx: encodeCtx) {
        ctx.encodeNumber(Number(tx.accountID), this.nAccountLevel);
        ctx.encodeNumber(Number(tx.accountID), this.nAccountLevel);
        ctx.encodeNumber(Number(tx.tokenID), this.nTokenLevel);
        ctx.encodeNumber(Number(encodeFloat(tx.amount)), config.floatLength)
    }

    encodeSpotTrade(tx: tx.SpotTradeTx, ctx: encodeCtx) {
        throw new Error('no implementment')
    }

    digest() {

        if (this._hasDigested)throw new Error('hasaher is for one-time use')
        Object.defineProperty(this, '_hasDigested', {value: false})

        let hasher = new Hash
        hasher.update(this.seal())
    
        return Buffer.from(hasher.digest())        
    }
}

export function DA_HashTxs(txs: Array<tx.RawTx>) : Buffer {

    const {TxDetailIdx} = tx

    let ctx = new encodeCtx
    for (let tx of txs){
        const {payload} = tx
        ctx.encodeNumber(Number(payload[TxDetailIdx.AccountID1]), this.nAccountLevel)
        ctx.encodeNumber(Number(payload[TxDetailIdx.AccountID2]), this.nAccountLevel)
        ctx.encodeNumber(Number(payload[TxDetailIdx.TokenID1]), this.nTokenLevel)
        ctx.encodeNumber(Number(payload[TxDetailIdx.Amount]), this.nAccountLevel)
    }

    let hasher = new Hash
    hasher.update(ctx.seal())

    return Buffer.from(hasher.digest())
}

export {DA_Hasher}

export default {DA_Hasher, DA_HashTxs}