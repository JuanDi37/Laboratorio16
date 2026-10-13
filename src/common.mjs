import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const config = JSON.parse(readFileSync(resolve(ROOT, 'lab.config.json'), 'utf8'));
export const MAX_BYTES = 1_000_000;
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export const topicBuffer = text => createHash('sha256').update(text).digest();
export const short = value => Buffer.isBuffer(value) ? value.toString('hex').slice(0, 12) : String(value).slice(0, 12);
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function args(argv = process.argv.slice(2)) {
  const options = { command: argv[0] };
  for (let i = 1; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Argumento inesperado: ${argv[i]}`);
    const name = argv[i].slice(2);
    if (i + 1 === argv.length || argv[i + 1].startsWith('--')) options[name] = true;
    else options[name] = argv[++i];
  }
  return options;
}

export function number(value, fallback, min = 0, max = 600000) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Número fuera de rango [${min}, ${max}]: ${value}`);
  return n;
}

export function workspacePath(path) {
  const full = resolve(ROOT, path);
  const rel = relative(ROOT, full);
  if (rel === '..' || rel.startsWith(`..${sep}`) || /^[A-Za-z]:/.test(rel)) throw new Error('La salida debe estar dentro del proyecto');
  return full;
}

export function logger(role, options = {}) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${role}-${randomUUID().slice(0, 8)}`;
  const file = workspacePath(options.log ?? `evidence/${runId}.jsonl`);
  mkdirSync(dirname(file), { recursive: true });
  const scope = options.scope ?? 'manual';
  const log = (event, data = {}) => {
    const entry = { ...data, timestamp: new Date().toISOString(), runId, scope, role, event };
    const line = JSON.stringify(entry);
    appendFileSync(file, `${line}\n`);
    process.stdout.write(`${line}\n`);
    return entry;
  };
  log.file = file;
  return log;
}

export function remoteAddress(socket) {
  const raw = socket.rawStream;
  const addr = typeof raw?.remoteAddress === 'function' ? raw.remoteAddress() : raw?.remoteAddress;
  return {
    host: socket.remoteHost ?? socket.remoteAddress ?? raw?.remoteHost ?? addr?.host ?? null,
    port: socket.remotePort ?? raw?.remotePort ?? addr?.port ?? null,
    source: 'socket/rawStream; dirección observada, no prueba de IP pública ni de ruta directa',
    relay: typeof raw?.relay === 'boolean' ? raw.relay : 'no determinado'
  };
}

export function bootstrapOptions(options) {
  if (!options.bootstrap) return {};
  // Solo IPv4/hostname:puerto para que el comando sea reproducible en Windows.
  const entries = String(options.bootstrap).split(',').map(entry => {
    const match = /^([^:]+):(\d+)$/.exec(entry);
    if (!match) throw new Error('Usa --bootstrap host:puerto[,host:puerto]');
    return { host: match[1], port: number(match[2], 0, 1, 65535) };
  });
  return { bootstrap: entries, ...(options.local ? { host: '127.0.0.1', firewalled: false } : {}) };
}

export function validateManifest(m) {
  if (!m || m.protocol !== 'cs031-file-v1') throw new Error('Manifest desconocido');
  for (const field of ['size', 'chunkBytes', 'blocks']) if (!Number.isInteger(m[field])) throw new Error(`Manifest: ${field} debe ser entero`);
  number(m.size, 0, 1, MAX_BYTES);
  number(m.chunkBytes, 0, 1024, 65536);
  if (m.blocks !== Math.ceil(m.size / m.chunkBytes)) throw new Error('Cantidad de bloques inválida');
  if (!/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error('SHA-256 inválido');
  if (typeof m.name !== 'string' || m.name.length > 150) throw new Error('Nombre inválido');
  return m;
}
