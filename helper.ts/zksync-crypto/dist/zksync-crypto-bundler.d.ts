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
