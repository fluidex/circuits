import { Buffer } from 'buffer';

class encodeCtx {

    private applyingBit: Array<number>;
    private encodingBuf: Array<number>;
    private encodingChar: number;

    constructor(){
        this.applyingBit = [128,64,32,16,8,4,2,1];
        this.encodingBuf = [];
        this.encodingChar = 0;
    }

    applyBit(isZero: boolean){
        let ac = this.applyingBit.shift()
        if (!isZero){
            this.encodingChar += ac
        }
        
        if (this.applyingBit.length === 0){
            this.nextByte()
        }
    }

    nextByte(){
        //sanity checking ...
        if (this.applyingBit.length >0){
            throw new Error('called when current byte is not finished');
        }
        if (this.encodingChar > 0xFF){
            throw new Error('wrong char');
        }
        this.encodingBuf.push(this.encodingChar);
        this.encodingChar = 0;
        this.applyingBit.unshift(128,64,32,16,8,4,2,1);
    }

    //end encoding and turn result into buffer
    seal() : Buffer {
        this.encodingBuf.push(this.encodingChar)
        return Buffer.from(this.encodingBuf)
    }

    encodeNumber(n: number, bits: number){
        if (n < 0 || !Number.isInteger(n)){
            throw new Error(`invalid: ${n}, only positive integer is allowed`);
        }

        for(let i = 0; i  < bits; i++){
            this.applyBit((n & 1) === 0);
            n >>= 1;
        }
        if (n > 0){
            throw new Error('can not encode number within specified bits')
        }
    }

    encodeStr(s: string){
        for (let i = 0; i < s.length; i++){
            this.encodeNumber(s.charCodeAt(i), 8)
        }
    }

}

let ctx = new encodeCtx
ctx.encodeNumber(4, 3)
ctx.encodeNumber(7, 3)
ctx.encodeNumber(55, 16)
ctx.encodeNumber(184442877, 40)
const bts = ctx.seal()
if (bts.toString('hex') !== '3fb002ffe9fd4000')throw new Error(`bitstream encode fail: ${bts.toString('hex')}`)


export {encodeCtx}

export default {encodeCtx}