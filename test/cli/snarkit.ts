import { parepareCircuitDir, testCircuitDir } from '../tester/c';
import * as path from 'path';
import * as fs from 'fs';

// TODO: use yargs here

async function main() {
  const command = process.argv[2];
  if (command == 'compile') {
    await parepareCircuitDir(process.argv[3], { alwaysRecompile: false, verbose: true });
  } else if (command == 'test') {
    const circuitDir = process.argv[3];
    await testCircuitDir(circuitDir);
  } else {
    throw new Error('invalid argv ' + process.argv);
  }
}

if (require.main === module) {
  main();
}
