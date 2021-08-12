import * as path from 'path';
export function circuitSrcToName(s: string): string {
  return s.replace(/[ )]/g, '').replace(/[(,]/g, '_');
}
export function getRepoDir(): string {
  return path.join(__dirname, '..', '..');
}
export function getCircomlibCircuitsDir(): string {
  //return path.join(getRepoDir(), "node_modules/circomlib/circuits")
  return path.join(require.resolve('circomlib'), '..', 'circuits');
}
export function getCircuitSrcDir(): string {
  return path.join(getRepoDir(), 'src');
}
