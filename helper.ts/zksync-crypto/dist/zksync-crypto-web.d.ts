/* tslint:disable */
/* eslint-disable */
/**
* This method initializes params for current thread, otherwise they will be initialized when signing
* first message.
*/
export function zksync_crypto_init(): void;
/**
* @param {Uint8Array} seed 
* @returns {Uint8Array} 
*/
export function privateKeyFromSeed(seed: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} pubkey 
* @returns {Uint8Array} 
*/
export function pubKeyHash(pubkey: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} private_key 
* @returns {Uint8Array} 
*/
export function private_key_to_pubkey_hash(private_key: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} private_key 
* @returns {Uint8Array} 
*/
export function private_key_to_pubkey(private_key: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} msg 
* @returns {Uint8Array} 
*/
export function rescueHash(msg: Uint8Array): Uint8Array;
/**
* We use musig Schnorr signature scheme.
* It is impossible to restore signer for signature, that is why we provide public key of the signer
* along with signature.
* [0..32] - packed public key of signer.
* [32..64] - packed r point of the signature.
* [64..96] - s poing of the signature.
* @param {Uint8Array} private_key 
* @param {Uint8Array} msg 
* @returns {Uint8Array} 
*/
export function sign_musig(private_key: Uint8Array, msg: Uint8Array): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly zksync_crypto_init: () => void;
  readonly privateKeyFromSeed: (a: number, b: number, c: number) => void;
  readonly pubKeyHash: (a: number, b: number, c: number) => void;
  readonly private_key_to_pubkey_hash: (a: number, b: number, c: number) => void;
  readonly private_key_to_pubkey: (a: number, b: number, c: number) => void;
  readonly rescueHash: (a: number, b: number, c: number) => void;
  readonly sign_musig: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        