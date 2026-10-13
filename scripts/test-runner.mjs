import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { ROOT, logger, workspacePath } from '../src/common.mjs';
const log = logger('validation', { scope: 'preparation', log: 'evidence/validation.jsonl' });
log('validation_start', { runtime: process.version, coverage: 'Protocolo, muestras y reporte; sin dependencias de red' });
// La prueba del reporte coteja un índice preparado con los archivos del momento.
let result = spawnSync(process.execPath, ['scripts/report.mjs'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
if (result.status !== 0) { console.error(result.stderr ?? result.error?.message); process.exit(1); }
result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', 'test/protocol.test.mjs', 'test/server.test.mjs'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`;
await writeFile(workspacePath('evidence/tests.tap.txt'), output);
process.stdout.write(output);
log('validation_result', { passed: result.status === 0, exitCode: result.status, output: 'evidence/tests.tap.txt', limit: 'No verifica Hyperswarm en red, Hypercore en ejecución ni kill-seeder. Requiere instalar dependencias para esas pruebas.' });
const report = spawnSync(process.execPath, ['scripts/report.mjs'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
process.stdout.write(report.stdout ?? '');
if (report.status !== 0) console.error(report.stderr ?? report.error?.message);
process.exitCode = result.status === 0 && report.status === 0 ? 0 : 1;
