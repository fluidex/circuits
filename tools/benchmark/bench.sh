#!/bin/bash
set -uex

CIRCUIT_POW=20
CIRCUIT=transfer
export CIRCUIT_DIR=data/$CIRCUIT

ZKUTIL_BIN=zkutil
PLONKIT_BIN=plonkit
export RAPIDSNARK_DIR=`pwd`/../../node_modules/rapidsnark
RAPIDSNARK_BIN=$RAPIDSNARK_DIR/build/prover

function prepare_tools() {
    echo install zkutil
    cargo install --git https://github.com/poma/zkutil
    echo install rapidsnark
    if [ ! -f $RAPIDSNARK_BIN ]; then
        source ./install_rapidsnark.sh
    fi
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

function bench_groth16_rapidsnark() {
    echo benchmark groth16 with rapidsnark
    pushd $CIRCUIT_DIR
    ZKEY_FILE=zkey.zkey
    PTAU_FILE=powersoftau.ptau
    if [ ! -f $PTAU_FILE ]; then
        echo generate powersoftau
        npx snarkjs ptn bn128 ${CIRCUIT_POW} powersoftau_0000.ptau -v
        npx snarkjs ptc powersoftau_0000.ptau powersoftau_0001.ptau --name="some contribution" -e="some random text" -v
        npx snarkjs pt2 powersoftau_0001.ptau $PTAU_FILE -v
    fi
    # npx snarkjs ptv $PTAU_FILE -v
    if [ ! -f $ZKEY_FILE ]; then
        echo generate zkey
        npx snarkjs zkn circuit.r1cs $PTAU_FILE $ZKEY_FILE -v
    fi
    (time $RAPIDSNARK_BIN $ZKEY_FILE witness.wtns proof.json public.json) 2>rapidsnark.time
    popd
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
    KEY=`pwd`/keys/plonk/2pow${CIRCUIT_POW}.key
    KEY_LAG=`pwd`/keys/plonk/2pow${CIRCUIT_POW}_lagrange.key
    if [ ! -f $KEY ]; then
        mkdir -p keys/plonk
        $PLONKIT_BIN setup --power ${CIRCUIT_POW} --srs_monomial_form $KEY
    fi
    pushd $CIRCUIT_DIR
    rm vk.bin || true # TODO: add overwrite option to $PLONKIT_BIN
    $PLONKIT_BIN analyse
    $PLONKIT_BIN export-verification-key --srs_monomial_form $KEY --circuit circuit.r1cs --vk vk.bin
    $PLONKIT_BIN dump-lagrange -m $KEY -l $KEY_LAG -c circuit.r1cs
    (time $PLONKIT_BIN prove --srs_monomial_form $KEY --circuit circuit.r1cs --witness witness.wtns --proof proof.bin) 2>plonkit.time
    (time $PLONKIT_BIN prove -m $KEY -l $KEY_LAG -c circuit.r1cs -w witness.wtns -p proof.bin) 2>plonkit_lagrange.time
    $PLONKIT_BIN verify --proof proof.bin --verification_key vk.bin
    popd
    node profile_circuit.js $CIRCUIT_DIR
}

# mkdir -p $CIRCUIT_DIR
# npx ts-node export_circuit.ts $CIRCUIT_DIR
# prepare_tools
# prepare_data
# bench_groth16_zkutil
bench_groth16_rapidsnark
# bench_plonk_plonkit
echo -e "\n\n =========== benchmark results: ================= \n"
head $CIRCUIT_DIR/*time
