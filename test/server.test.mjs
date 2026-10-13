import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { ROOT } from '../src/common.mjs';
let child, exited, address;
before(async () => {
  const port = 39000 + Math.floor(Math.random() * 15000);
  address = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: ROOT, windowsHide: true, env: { ...process.env, LAB16_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  exited = new Promise(resolve => child.once('exit', resolve));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Visor no inició')), 8000);
    child.stdout.on('data', chunk => { if (chunk.toString().includes('Informe:')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', chunk => { clearTimeout(timer); reject(new Error(chunk.toString())); });
    child.once('error', err => { clearTimeout(timer); reject(err); });
  });
});
after(async () => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
  await exited;
  clearTimeout(timer);
});
test('visor sirve HTML, assets y evidencia mediante HTTP local', async () => {
  for (const path of ['/', '/web/style.css', '/web/app.js', '/P2P.md', '/evidence/manifest.json']) {
    const response = await fetch(`${address}${path}`);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});
test('visor bloquea keys, logs privados, node_modules y rutas de escape', async () => {
  for (const path of ['/.runtime/handoff.json', '/evidence/private/secret.json', '/.git/config', '/node_modules/package.json', '/evidence/%5c..%5c..%5csecret.txt']) {
    const response = await fetch(`${address}${path}`);
    assert.equal(response.status, 403, path);
    await response.text();
  }
});
