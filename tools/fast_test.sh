#!/bin/bash
set -exu

function setup() {
	#npm i
	npx tsc
	# TODO how to handle this?
	cp helper.ts/rescue_wasm/rescue-wasm_bg.wasm dist/helper.ts/rescue_wasm/
	ln -s ../node_modules dist || true
	ln -s ../src dist || true
}

function generateTestCases() {
	time node -e 'require("./dist/test/test_all.js").exportAllTests()'
}

function testAll() {
	for d in `ls testdata`;
	do
		node dist/test/cli/snarkit.js test testdata/$d &
	done
	wait
}

setup
generateTestCases
testAll

