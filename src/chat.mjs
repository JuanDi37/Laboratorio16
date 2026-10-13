import { makeSwarm } from './network.mjs';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { config, logger, topicBuffer, short, number, remoteAddress } from './common.mjs';

export async function chat(options) {
  const log = logger('chat', options);
  const carnet = String(options.carnet ?? config.carnet);
  const topicText = String(options.topic ?? config.topic);
  const topic = topicBuffer(topicText);
  const swarm = makeSwarm(options);
  let connected = false, sent = 0, received = 0, closing = false, timer, input;
  const sockets = new Set();
  const pending = new Set();
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const stop = async (reason, code = 0) => {
    if (closing) return;
    closing = true;
    clearTimeout(timer);
    input?.close();
    log('chat_result', { connected, sent, received, reason, topicId: short(topic) });
    console.error(`connected: ${connected ? 'sí' : 'no'}\ntopic: ${short(topic)}`);
    try { await swarm.destroy(); }
    finally { process.exitCode = code; resolveDone(); }
  };
  const send = (socket, payload) => {
    const id = randomUUID();
    pending.add(id);
    socket.write(JSON.stringify({ type: 'ping', id, payload }) + '\n');
    sent++;
    log('message_sent', { peerId: short(socket.remotePublicKey), messageId: id, payload });
  };
  swarm.on('error', err => { log('swarm_error', { message: err.message, code: err.code }); void stop('swarm_error', 1); });
  swarm.on('connection', (socket, info) => {
    connected = true;
    sockets.add(socket);
    const peerId = short(info.publicKey);
    log('connection', { peerId, remote: remoteAddress(socket), topicId: short(topic) });
    let buffered = Buffer.alloc(0);
    socket.on('data', chunk => {
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length > 8192) { log('protocol_error', { peerId, message: 'Frame demasiado grande' }); socket.destroy(); return; }
      let end;
      while ((end = buffered.indexOf(10)) !== -1) {
        const frame = buffered.subarray(0, end).toString('utf8');
        buffered = buffered.subarray(end + 1);
        try {
          const m = JSON.parse(frame);
          if (m.type === 'ping' && typeof m.payload === 'string' && m.payload.length <= 1000 && typeof m.id === 'string') {
            received++;
            log('message_received', { peerId, messageId: m.id, payload: m.payload });
            socket.write(JSON.stringify({ type: 'ack', id: m.id }) + '\n');
          } else if (m.type === 'ack' && pending.delete(m.id)) {
            log('message_ack', { peerId, messageId: m.id });
          } else throw new Error('Tipo de frame inválido');
          if (options['exit-after-ping'] && received && sent && pending.size === 0) setTimeout(() => void stop('ping_exchange_complete'), 400);
        } catch (err) { log('protocol_error', { peerId, message: err.message }); socket.destroy(); }
      }
    });
    socket.on('error', err => log('socket_error', { peerId, message: err.message, code: err.code }));
    socket.on('close', () => { sockets.delete(socket); log('disconnection', { peerId }); });
    send(socket, String(options.message ?? `ping desde ${carnet}`));
  });
  log('join', { carnet, localPeerId: short(swarm.keyPair.publicKey), topicText, topicId: short(topic), topicBytes: topic.length, server: true, client: true, bootstrap: options.bootstrap ?? 'defaults de HyperDHT; ver infrastructure en logs de transferencia' });
  const discovery = swarm.join(topic, { server: true, client: true });
  discovery.flushed().then(() => { if (!closing) log('announced', { topicId: short(topic) }); }).catch(err => { if (!closing) log('announce_error', { message: err.message }); });
  timer = setTimeout(() => {
    log('timeout', { timeoutMs: number(options.timeout, config.timeoutMs, 1000), connected, peers: sockets.size, connecting: swarm.connecting, diagnosis: connected ? 'Conexión observada; revisar eventos message_received y ack' : 'No se observaron peers. Puede ser topic distinto, compañero offline, bootstrap inaccesible, UDP/NAT/firewall. La causa no está demostrada.' });
    void stop(connected && received ? 'timeout_after_exchange' : 'no_exchange_before_timeout', received ? 0 : 2);
  }, number(options.timeout, config.timeoutMs, 1000));
  if (process.stdin.isTTY) {
    input = createInterface({ input: process.stdin, output: process.stderr });
    input.on('line', line => { if (line === '/quit') void stop('user_exit'); else if (line.length <= 1000) for (const socket of sockets) send(socket, line); });
    console.error('Escribe mensajes; /quit para terminar. Se enviará el ping automáticamente.');
  }
  process.once('SIGINT', () => void stop('SIGINT'));
  process.once('SIGTERM', () => void stop('SIGTERM'));
  await done;
}
