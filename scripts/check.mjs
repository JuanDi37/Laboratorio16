import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT, logger } from '../src/common.mjs';
const log = logger('check', { scope: 'preparation' });
const sources = [];
for (const dir of ['src', 'scripts', 'test', 'web']) {
  for (const entry of await readdir(resolve(ROOT, dir), { withFileTypes: true })) if (entry.isFile() && /\.m?js$/.test(entry.name)) sources.push(resolve(ROOT, dir, entry.name));
}
let syntaxPassed = true, dependenciesReady = true;
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) { syntaxPassed = false; log('syntax_error', { file, message: result.stderr ?? result.error?.message }); }
}
for (const dependency of ['hyperswarm', 'hypercore', 'hyperdht']) {
  try { const value = await import(dependency); log('dependency_ready', { dependency, exportType: typeof value.default }); }
  catch (err) { dependenciesReady = false; log('dependency_missing', { dependency, code: err.code, message: err.message }); }
}
log('checks_complete', { node: process.version, syntaxPassed, filesChecked: sources.length, dependenciesReady, peerExchangeVerified: false, limitation: 'Sintaxis e imports no verifican transporte, NAT, transferencia ni kill.' });
if (!syntaxPassed || !dependenciesReady) process.exitCode = 1;
