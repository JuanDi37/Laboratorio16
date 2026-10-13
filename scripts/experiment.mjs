import DHT from 'hyperdht';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { ROOT, workspacePath, logger, args, config } from '../src/common.mjs';
import { makeSample } from './sample.mjs';

const options = args(['experiment', ...process.argv.slice(2)]);
const allowed = ['chat', 'baseline', 'single', 'replica', 'all'];
const scenario = options.scenario ?? 'all';
if (!allowed.includes(scenario)) throw new Error(`--scenario debe ser ${allowed.join(', ')}`);
const suiteId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const dir = `evidence/local-${suiteId}`;
await mkdir(workspacePath(dir), { recursive: true });
const log = logger('controller', { log: `${dir}/controller.jsonl`, scope: 'local-automated' });
const children = [];
let bootstrap, persistent;

function start(name, command, extra) {
  const events = new EventEmitter();
  const seen = [];
  const child = spawn(process.execPath, ['src/cli.mjs', command, '--local', '--bootstrap', `127.0.0.1:${bootstrap.address().port}`, '--scope', 'local-automated', '--log', `${dir}/${name}.jsonl`, '--timeout', '90000', ...extra], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let buffered = '', stderr = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffered += chunk;
    let end;
    while ((end = buffered.indexOf('\n')) !== -1) {
      const line = buffered.slice(0, end);
      buffered = buffered.slice(end + 1);
      try { const entry = JSON.parse(line); seen.push(entry); events.emit('entry', entry); } catch { /* diagnostic output */ }
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise(resolve => {
    child.once('error', err => { log('child_spawn_error', { name, message: err.message }); resolve({ code: 1 }); });
    child.once('exit', (code, signal) => { log('child_exit', { name, pid: child.pid, code, signal, stderr: stderr.replace(/CORE_KEY=[a-f0-9]+/g, 'CORE_KEY=[public key en handoff]') }); resolve({ code, signal }); });
  });
  const wait = (predicate, timeout = 35000) => new Promise((resolve, reject) => {
    const found = seen.find(predicate);
    if (found) return resolve(found);
    const onEntry = e => { if (predicate(e)) { clearTimeout(timer); events.off('entry', onEntry); resolve(e); } };
    const timer = setTimeout(() => { events.off('entry', onEntry); reject(new Error(`${name}: evento no observado en ${timeout} ms`)); }, timeout);
    events.on('entry', onEntry);
    done.then(() => { if (!seen.some(predicate)) { clearTimeout(timer); events.off('entry', onEntry); reject(new Error(`${name}: proceso terminó antes del evento esperado`)); } });
  });
  const proc = { child, seen, done, wait, name };
  children.push(proc);
  log('child_started', { name, pid: child.pid, log: `${dir}/${name}.jsonl` });
  return proc;
}

async function terminate(proc, force = false) {
  if (proc.child.exitCode !== null || proc.child.signalCode !== null) return;
  proc.child.kill(force ? 'SIGKILL' : 'SIGTERM');
  let timer;
  const exited = await Promise.race([proc.done.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), 4000); })]);
  clearTimeout(timer);
  if (!exited) { proc.child.kill('SIGKILL'); await proc.done; }
}

async function fileScenario(mode) {
  const handoffPath = `.runtime/${suiteId}-${mode}-handoff.json`;
  const seeder = start(`${mode}-seed`, 'seed', ['--file', 'samples/lab16.txt', '--handoff', handoffPath]);
  await seeder.wait(e => e.event === 'seed_ready');
  await seeder.wait(e => e.event === 'announced');
  const handoff = JSON.parse(await readFile(workspacePath(handoffPath), 'utf8'));
  let mirror, killObservation;
  if (mode === 'replica') {
    mirror = start('replica-mirror', 'download', ['--key', handoff.key, '--delay', '0', '--stay', '--out', `downloads/${suiteId}-mirror.txt`]);
    await mirror.wait(e => e.event === 'replica_ready');
    await mirror.wait(e => e.event === 'announced');
  }
  const downloader = start(`${mode}-downloader`, 'download', ['--key', handoff.key, '--delay', '180', '--block-timeout', '6000', '--out', `downloads/${suiteId}-${mode}.txt`]);
  if (mode !== 'baseline') {
    const halfway = await downloader.wait(e => e.event === 'progress' && e.percent >= 50 && e.percent < 100);
    // No se mata después de haber leído todo desde caché: el evento registra bytes realmente descargados.
    const atKill = downloader.seen.filter(e => e.event === 'block_downloaded' && e.index > 0).reduce((n, e) => n + e.bytes, 0);
    killObservation = log('kill_seeder', { scenario: mode, pid: seeder.child.pid, percent: halfway.percent, consumedBytes: halfway.downloadedBytes, networkBytesAtKill: atKill, totalBytes: handoff.manifest.size, missingNetworkBytesAtKill: handoff.manifest.size - atKill, anotherFullSeeder: Boolean(mirror), mirrorPid: mirror?.child.pid ?? null, method: 'SIGKILL al proceso hijo iniciado por este controlador' });
    await terminate(seeder, true);
  }
  const result = await downloader.wait(e => ['transfer_complete', 'transfer_failed'].includes(e.event), 40000);
  await downloader.done;
  const validKill = !killObservation || killObservation.missingNetworkBytesAtKill > 0;
  // El criterio de un kill válido usa la observación del controlador, no el número de peers conectados.
  const observed = mode === 'baseline' ? null : downloader.seen.find(e => e.event === 'progress' && e.percent >= 50);
  log('scenario_result', { scenario: mode, completed: result.event === 'transfer_complete', expectedCompleted: mode !== 'single', validKill, size: handoff.manifest.size, sha256: handoff.manifest.sha256, anotherFullSeeder: Boolean(mirror), downloaderEvent: result.event, downloaderMessage: result.message ?? null, progressBeforeKill: observed?.percent ?? null, note: 'Prueba real entre procesos del mismo equipo en DHT privada. No sustituye dos compañeros, Internet, NAT ni holepunch del aula.' });
  await terminate(seeder);
  if (mirror) await terminate(mirror);
  return validKill && (result.event === 'transfer_complete' ? mode !== 'single' : mode === 'single');
}

try {
  log('suite_start', { scenario, topicText: config.topic, warning: 'Solo procesos locales, no compañeros reales; puertos UDP en loopback' });
  bootstrap = DHT.bootstrapper(0, '127.0.0.1');
  await bootstrap.fullyBootstrapped();
  persistent = new DHT({ bootstrap: [{ host: '127.0.0.1', port: bootstrap.address().port }], host: '127.0.0.1', ephemeral: false });
  await persistent.fullyBootstrapped();
  log('local_infrastructure', { bootstrap: bootstrap.address(), persistent: persistent.address(), relays: 'No configurados en esta DHT privada' });
  await makeSample();
  const results = [];
  if (scenario === 'chat' || scenario === 'all') {
    const topic = `${config.topic}-local-${suiteId}`;
    const a = start('chat-a', 'chat', ['--topic', topic, '--carnet', config.carnet, '--exit-after-ping']);
    await a.wait(e => e.event === 'announced');
    const b = start('chat-b', 'chat', ['--topic', topic, '--carnet', 'PEER_LOCAL_B', '--exit-after-ping']);
    await Promise.all([a.wait(e => e.event === 'message_received'), b.wait(e => e.event === 'message_received')]);
    await Promise.all([a.done, b.done]);
    log('scenario_result', { scenario: 'chat', completed: true, messagesA: a.seen.filter(e => e.event === 'message_received').length, messagesB: b.seen.filter(e => e.event === 'message_received').length });
    results.push(true);
  }
  for (const mode of ['baseline', 'single', 'replica']) if (scenario === mode || scenario === 'all') results.push(await fileScenario(mode));
  log('suite_result', { passed: results.every(Boolean), scenarios: results.length });
  if (!results.every(Boolean)) process.exitCode = 1;
} catch (err) {
  log('suite_error', { message: err.message, diagnosis: 'No afirmar éxito. Revisar logs y soporte UDP/local de este entorno.' });
  process.exitCode = 1;
} finally {
  await Promise.all(children.map(proc => terminate(proc)));
  await persistent?.destroy();
  await bootstrap?.destroy();
  console.error(`Evidencia: ${dir}\nActualiza el HTML con npm.cmd run report`);
}
