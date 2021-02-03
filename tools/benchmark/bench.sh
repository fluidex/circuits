#!/bin/bash
set -uex


PLONKIT_BIN=plonkit
CIRCUIT=transfer
export CIRCUIT_DIR=data/$CIRCUIT

function prepare_data() {
    echo process circuit in $CIRCUIT_DIR
    source ./process_circom_circuit.sh
}

function bench_groth16_snarkjs_wasm() {
    echo benchmark groth16 with snarkjs wasm
}
function bench_groth16_snarkjs_cpp() {
    echo benchmark groth16 with snarkjs cpp
    # https://github.com/iden3/rapidsnark
}
function bench_groth16_zkutil() {
    echo benchmark groth16 with zkutil
    pushd $CIRCUIT_DIR
    zkutil setup
    (time zkutil prove) 2>zkutil.time
    zkutil verify
    popd
}


function bench_plonk_plonkit() {
    echo benchmark plonkit with plonkit
    CIRCUIT_POW=20
    KEY=`pwd`/keys/plonk/2pow${CIRCUIT_POW}.key
    if [ ! -f $KEY ]; then
        mkdir -p keys/plonk
        $PLONKIT_BIN setup --power ${CIRCUIT_POW} --srs_monomial_form $KEY
    fi
    pushd $CIRCUIT_DIR
    rm vk.bin || true # TODO: add overwrite option to $PLONKIT_BIN
    $PLONKIT_BIN analyse
    $PLONKIT_BIN export-verification-key --srs_monomial_form $KEY --circuit circuit.r1cs.json --vk vk.bin
    (time $PLONKIT_BIN prove --srs_monomial_form $KEY --circuit circuit.r1cs.json --witness witness.json --proof proof.bin) 2>plonkit.time
    $PLONKIT_BIN verify --proof proof.bin --verification_key vk.bin
    popd
    node profile_gates.js $CIRCUIT_DIR
}

mkdir -p $CIRCUIT_DIR
npx ts-node export_circuit.ts $CIRCUIT_DIR
prepare_data
bench_groth16_zkutil
bench_plonk_plonkit
echo -e "\n\n =========== benchmark results: ================= \n"
head $CIRCUIT_DIR/*time
