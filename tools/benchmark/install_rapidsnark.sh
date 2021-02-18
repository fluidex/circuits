#!/bin/bash
set -ex

sudo apt install build-essential
sudo apt-get install libgmp-dev
sudo apt-get install libsodium-dev
sudo apt-get install nasm

git clone git@github.com:iden3/rapidsnark.git $RAPIDSNARK_DIR || true
pushd $RAPIDSNARK_DIR
npm install
git submodule init
git submodule update
npx task createFieldSources
npx task buildProver
popd
