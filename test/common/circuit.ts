import * as path from 'path';
export function circuitSrcToName(s: string): string {
  return s.replace(/[ )]/g, '').replace(/[(,]/g, '_');
}
export function getCircuitSrcDir(): string {
  return path.join(__dirname, '..', '..', 'src');
}
