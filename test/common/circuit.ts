export function circuitSrcToName(s: string): string {
  return s.replace(/[ )]/g, '').replace(/[(,]/g, '_');
}
