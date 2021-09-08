import {config, encodeFloat} from '../codec/float'
import {Hash} from 'fast-sha256'
import {encodeCtx} from '../codec/bitstream'
import * as tx from './tx'

export function txDAEncodeLength(nAccountLevel, nTokenLevel){
    return nAccountLevel * 2 + nTokenLevel + config.floatLength
}

const {TxDetailIdx} = tx

class DA_Hasher extends encodeCtx {

    private nAccountLevel : number;
    private nTokenLevel : number;

    constructor(nAccountLevel, nTokenLevel){
        super()
        this.nAccountLevel = nAccountLevel
        this.nTokenLevel = nTokenLevel
    }

    encodeTransfer(tx: tx.TranferTx) {
        this.encodeNumber(Number(tx.from), this.nAccountLevel);
        this.encodeNumber(Number(tx.to), this.nAccountLevel);
        this.encodeNumber(Number(tx.tokenID), this.nTokenLevel);
        this.encodeNumber(Number(encodeFloat(tx.amount)), config.floatLength)
    }

    encodeDeposit(tx: tx.DepositToOldTx | tx.DepositToNewTx) {
        this.encodeNumber(Number(tx.accountID), this.nAccountLevel);
        this.encodeNumber(Number(tx.accountID), this.nAccountLevel);
        this.encodeNumber(Number(tx.tokenID), this.nTokenLevel);
        this.encodeNumber(Number(encodeFloat(tx.amount)), config.floatLength)
    }

    encodeNop() {
        this.encodeNumber(0, txDAEncodeLength(this.nAccountLevel, this.nTokenLevel));
    }

    encodeSpotTrade(tx: tx.SpotTradeTx) {
        throw new Error('no implementment')
    }

    encodeRawTx(tx: tx.RawTx) {
        const {payload} = tx
        this.encodeRawPayload(payload);
    }

    encodeRawPayload(payload: Array<bigint>) {
        this.encodeNumber(Number(payload[TxDetailIdx.AccountID1]), this.nAccountLevel)
        this.encodeNumber(Number(payload[TxDetailIdx.AccountID2]), this.nAccountLevel)
        this.encodeNumber(Number(payload[TxDetailIdx.TokenID1]), this.nTokenLevel)
        this.encodeNumber(Number(payload[TxDetailIdx.Amount]), config.floatLength)        
    }

    digest() : Buffer {

        let hasher = new Hash
        hasher.update(this.seal())
    
        return Buffer.from(hasher.digest())        
    }

    digestToFF() : {Hi: bigint, Lo: bigint} {
        const buf = this.digest();
        const hi = buf.slice(0, 16);
        const lo = buf.slice(16);
        return {
            Hi: BigInt('0x'+ hi.toString('hex')),
            Lo: BigInt('0x'+ lo.toString('hex')),
        }
    }

}

/*
let hasher = new DA_Hasher(3, 3)
hasher.encodeTransfer({
    from: BigInt(2), 
    to: BigInt(6), 
    tokenID: BigInt(5), 
    amount: BigInt(6000),
    signature: null,
})
const digest = hasher.digest().toString('hex');
if (digest !== '935ff36260b8b0753e9ce725d0f4382a139c201ea8f6da4294bd4aa56b1db7ba') throw new Error(`unexpected digest ${digest}`)
const ffDigest = hasher.digestToFF()
if (ffDigest.Hi.toString(16) + ffDigest.Lo.toString(16) !== 
    '935ff36260b8b0753e9ce725d0f4382a139c201ea8f6da4294bd4aa56b1db7ba') throw new Error(`unexpected digest ${ffDigest.Hi.toString(16)} + ${ffDigest.Lo.toString(16)}`)
*/

export {DA_Hasher}

export default {txDAEncodeLength, DA_Hasher}