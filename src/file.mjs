import { makeSwarm } from './network.mjs';
import Hypercore from 'hypercore';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config, logger, number, short, sha256, sleep, MAX_BYTES, workspacePath, remoteAddress, validateManifest } from './common.mjs';

export async function transfer(options) {
  const seed = options.command === 'seed';
  const log = logger(seed ? 'seed' : 'download', options);
  const keyHex = options.key;
  if (!seed && !/^[a-fA-F0-9]{64}$/.test(keyHex ?? '')) throw new Error('download necesita --key con la public key de 64 caracteres del seeder');
  if (seed && !options.file) throw new Error('seed necesita --file samples/lab16.txt');
  // Un almacenamiento nuevo en cada ejecución evita confundir caché con supervivencia al kill.
  const storage = workspacePath(options.storage ?? `.runtime/${seed ? 'seed' : 'download'}-${randomUUID()}`);
  await mkdir(dirname(storage), { recursive: true });
  const core = new Hypercore(storage, seed ? undefined : Buffer.from(keyHex, 'hex'));
  await core.ready();
  const swarm = makeSwarm(options);
  const peers = new Set();
  let closing = false, timer, downloadedBytes = 0, manifest, networkBlocks = 0, networkBytes = 0;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const stop = async (reason, code = 0) => {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    log('shutdown', { reason, activePeers: peers.size });
    try { await swarm.destroy(); await core.close(); }
    finally { process.exitCode = code; resolveDone(); }
  };
  core.on('error', err => { log('core_error', { message: err.message, code: err.code }); void stop('core_error', 1); });
  core.on('download', (index, bytes, peer) => {
    networkBlocks++;
    if (index > 0) networkBytes += bytes;
    log('block_downloaded', { index, bytes, networkBytes, peerId: peer?.remotePublicKey ? short(peer.remotePublicKey) : null });
  });
  core.on('upload', (index, bytes, peer) => log('block_uploaded', { index, bytes, peerId: peer?.remotePublicKey ? short(peer.remotePublicKey) : null }));
  swarm.on('error', err => { log('swarm_error', { message: err.message, code: err.code }); void stop('swarm_error', 1); });
  swarm.on('connection', (socket, info) => {
    const peerId = short(info.publicKey);
    peers.add(peerId);
    log('connection', { peerId, remote: remoteAddress(socket), topicId: short(core.discoveryKey) });
    socket.on('error', err => log('socket_error', { peerId, message: err.message, code: err.code }));
    socket.on('close', () => { peers.delete(peerId); log('disconnection', { peerId, activePeers: peers.size, downloadedBytes, networkBytes }); });
    // El socket completo lleva protocolo binario Hypercore; no se mezcla con el chat.
    core.replicate(socket);
  });
  try {
    if (seed) {
      const file = resolve(options.file);
      const fileStat = await stat(file);
      if (fileStat.size < 1 || fileStat.size > MAX_BYTES) throw new Error('El archivo debe medir entre 1 y 1,000,000 bytes');
      const data = await readFile(file);
      const chunkBytes = number(options.chunk, config.chunkBytes, 1024, 65536);
      manifest = { protocol: 'cs031-file-v1', name: basename(file), size: data.length, chunkBytes, blocks: Math.ceil(data.length / chunkBytes), sha256: sha256(data), content: 'El usuario debe confirmar que no contiene PII ni copyright de terceros' };
      validateManifest(manifest);
      if (core.length !== 0) throw new Error('Usa storage nuevo para seeding; el core existente ya tiene datos');
      await core.append(Buffer.from(JSON.stringify(manifest)));
      for (let start = 0; start < data.length; start += chunkBytes) await core.append(data.subarray(start, start + chunkBytes));
      const handoff = workspacePath(options.handoff ?? '.runtime/handoff.json');
      await mkdir(dirname(handoff), { recursive: true });
      await writeFile(handoff, JSON.stringify({ key: core.key.toString('hex'), topicId: short(core.discoveryKey), manifest }, null, 2));
      log('seed_ready', { coreId: short(core.key), ...manifest, handoff: options.handoff ?? '.runtime/handoff.json' });
      console.error(`CORE_KEY=${core.key.toString('hex')}\nCopia esta public key al downloader. No es la clave privada.`);
    }
    log('join', { localPeerId: short(swarm.keyPair.publicKey), coreId: short(core.key), topicId: short(core.discoveryKey), topicBytes: 32, server: true, client: true, storage: storage.replaceAll('\\', '/') });
    log('infrastructure', { bootstrap: options.bootstrap ?? ['node1.hyperdht.org:49737', 'node2.hyperdht.org:49737', 'node3.hyperdht.org:49737'], bootstrapStatus: 'Configuración; no prueba que cada bootstrap respondió', relay: 'no determinado; no inferir ausencia de relay por tener connection', transport: 'Hyperswarm/Noise; Hypercore replication', network: options.local ? 'DHT privada en loopback; sin Internet' : 'DHT pública o bootstrap configurado' });
    const discovery = swarm.join(core.discoveryKey, { server: true, client: true });
    discovery.flushed().then(() => { if (!closing) log('announced', { topicId: short(core.discoveryKey) }); }).catch(err => { if (!closing) log('announce_error', { message: err.message }); });
    const timeoutMs = number(options.timeout, seed ? 300000 : 120000, 1000);
    timer = setTimeout(() => {
      log('timeout', { timeoutMs, activePeers: peers.size, downloadedBytes, networkBytes, diagnosis: 'Tiempo total agotado; revisar conexión, key y disponibilidad de bloques' });
      void stop('total_timeout', 2);
    }, timeoutMs);
    process.once('SIGINT', () => void stop('SIGINT'));
    process.once('SIGTERM', () => void stop('SIGTERM'));
    if (seed) {
      await done;
      return;
    }
    const blockTimeoutMs = number(options['block-timeout'], config.blockTimeoutMs, 1000);
    const header = await core.get(0, { timeout: blockTimeoutMs });
    if (header.length > 8192) throw new Error('Manifest demasiado grande');
    manifest = validateManifest(JSON.parse(header.toString('utf8')));
    log('manifest_received', { ...manifest, coreId: short(core.key) });
    const chunks = [];
    for (let index = 1; index <= manifest.blocks; index++) {
      const block = await core.get(index, { timeout: blockTimeoutMs });
      const expected = index === manifest.blocks ? manifest.size - (index - 1) * manifest.chunkBytes : manifest.chunkBytes;
      if (block.length !== expected) throw new Error(`Tamaño inválido en bloque ${index}`);
      chunks.push(block);
      downloadedBytes += block.length;
      log('progress', { index, blocks: manifest.blocks, downloadedBytes, totalBytes: manifest.size, percent: Number((downloadedBytes / manifest.size * 100).toFixed(2)), networkBytes, activePeers: peers.size });
      if (index !== manifest.blocks) await sleep(number(options.delay, config.delayMs, 0, 10000));
    }
    const data = Buffer.concat(chunks);
    const digest = sha256(data);
    if (digest !== manifest.sha256) throw new Error('Integridad SHA-256 falló');
    const output = workspacePath(options.out ?? `downloads/${Date.now()}-${basename(manifest.name).replace(/[^\w.-]/g, '_')}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, data, { flag: 'wx' });
    log('transfer_complete', { size: data.length, sha256: digest, verified: true, output, networkBlocks, networkBytes, activePeers: peers.size });
    if (options.stay) {
      log('replica_ready', { coreId: short(core.key), serving: true, note: 'Replica completa de lectura: puede servir bloques sin private key del escritor' });
      await done;
    } else await stop('transfer_complete');
  } catch (err) {
    if (!closing) {
      const cachedBlocks = manifest ? await core.count(1, manifest.blocks + 1).catch(() => null) : null;
      log('transfer_failed', { message: err.message, code: err.code ?? null, downloadedBytes, totalBytes: manifest?.size ?? null, networkBytes, cachedBlocks, activePeers: peers.size, diagnosis: 'Un peer conectado no garantiza que tenga todos los bloques faltantes. Ver kill event en log del controlador.' });
      await stop('transfer_failed', 2);
    }
  }
}
