import {parepareCircuitDir, testCircuitDir} from "../tester/c";

// TODO: use yargs here

async function main() {
    const command = process.argv[2];
    if (command == 'compile') {
        await parepareCircuitDir(process.argv[3], false);
    } else if (command == 'test') {
        await testCircuitDir(process.argv[3], '');
    } else {
        throw new Error('invalid argv ' + process.argv);
    }
}

main();