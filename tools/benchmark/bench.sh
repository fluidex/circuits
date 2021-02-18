#!/bin/bash
set -uex

ZKUTIL_BIN=zkutil
RAPIDSNARK_BIN=rapidsnark
PLONKIT_BIN=plonkit
CIRCUIT=transfer
export CIRCUIT_DIR=data/$CIRCUIT

function prepare_tools() {
    echo install zkutil
    cargo install --git https://github.com/poma/zkutil
    echo install rapidsnark
    echo install plonkit
    cargo install --git https://github.com/Fluidex/plonkit
}

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
    $ZKUTIL_BIN setup
    (time $ZKUTIL_BIN prove) 2>zkutil.time
    $ZKUTIL_BIN verify
    popd
}

function bench_plonk_plonkit() {
    echo benchmark plonkit with plonkit
    CIRCUIT_POW=20
    KEY=`pwd`/keys/plonk/2pow${CIRCUIT_POW}.key
    KEY_LAG=`pwd`/keys/plonk/2pow${CIRCUIT_POW}_lagrange.key
    if [ ! -f $KEY ]; then
        mkdir -p keys/plonk
        $PLONKIT_BIN setup --power ${CIRCUIT_POW} --srs_monomial_form $KEY
    fi
    pushd $CIRCUIT_DIR
    rm vk.bin || true # TODO: add overwrite option to $PLONKIT_BIN
    $PLONKIT_BIN analyse
    $PLONKIT_BIN export-verification-key --srs_monomial_form $KEY --circuit circuit.r1cs.json --vk vk.bin
    $PLONKIT_BIN dump-lagrange -m $KEY -l $KEY_LAG -c circuit.r1cs.json
    (time $PLONKIT_BIN prove --srs_monomial_form $KEY --circuit circuit.r1cs.json --witness witness.json --proof proof.bin) 2>plonkit.time
    (time $PLONKIT_BIN prove -m $KEY -l $KEY_LAG -c circuit.r1cs.json -w witness.json -p proof.bin) 2>plonkit_lagrange.time
    $PLONKIT_BIN verify --proof proof.bin --verification_key vk.bin
    popd
    node profile_circuit.js $CIRCUIT_DIR
}

mkdir -p $CIRCUIT_DIR
npx ts-node export_circuit.ts $CIRCUIT_DIR
prepare_tools
prepare_data
bench_groth16_zkutil
bench_plonk_plonkit
echo -e "\n\n =========== benchmark results: ================= \n"
head $CIRCUIT_DIR/*time
