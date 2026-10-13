import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { config, topicBuffer, sha256, validateManifest, workspacePath, MAX_BYTES } from '../src/common.mjs';
import { summarize, markdown, scanEvidence } from '../src/report-data.mjs';

const manifest = { protocol: 'cs031-file-v1', size: 786432, chunkBytes: 16384, blocks: 48, sha256: 'a'.repeat(64), name: 'lab16.txt' };
test('topic reproducible de 32 bytes; el texto distinto separa swarms', () => {
  assert.equal(topicBuffer(config.topic).length, 32);
  assert.deepEqual(topicBuffer(config.topic), topicBuffer(config.topic));
  assert.notDeepEqual(topicBuffer(config.topic), topicBuffer(`${config.topic}-otro`));
});
test('manifest rechaza exceso de tamaño, inconsistencias y digest inválido', () => {
  assert.equal(validateManifest(manifest), manifest);
  for (const change of [{ size: MAX_BYTES + 1 }, { size: 0 }, { size: -1 }, { blocks: 49 }, { sha256: 'incorrecto' }, { chunkBytes: 0 }, { protocol: 'otro' }]) {
    assert.throws(() => validateManifest({ ...manifest, ...change }));
  }
});
test('rutas de salida no pueden escapar del workspace', () => {
  assert.throws(() => workspacePath('../afuera.txt'));
  assert.throws(() => workspacePath('evidence/../../afuera.txt'));
  assert.match(workspacePath('evidence/dentro.txt'), /evidence[\\/]dentro\.txt$/);
});
test('muestra <=1 MB coincide byte a byte con el hash documentado', async () => {
  const data = await readFile(workspacePath('samples/lab16.txt'));
  const metadata = JSON.parse(await readFile(workspacePath('samples/sample.json'), 'utf8'));
  assert.equal(data.length, 786432);
  assert.ok(data.length <= MAX_BYTES);
  assert.equal(sha256(data), metadata.sha256);
  assert.ok(data.toString('utf8').includes('material sintetico propio'));
});
test('solo cuenta cotejos en otro run con el mismo topic y payload', () => {
  const rows = [
    { runId: 'a', event: 'join', scope: 'class', topicId: 'topic1' },
    { runId: 'b', event: 'join', scope: 'class', topicId: 'topic1' },
    { runId: 'a', event: 'message_sent', scope: 'class', messageId: 'm1', payload: 'ping' },
    { runId: 'a', event: 'message_received', scope: 'class', messageId: 'm1', payload: 'ping' }
  ];
  assert.equal(summarize([{ rows }]).classPairedMessages, 0);
  rows.push({ runId: 'b', event: 'message_received', scope: 'class', messageId: 'm1', payload: 'distinto' });
  assert.equal(summarize([{ rows }]).classPairedMessages, 0);
  rows.push({ runId: 'b', event: 'message_received', scope: 'local-automated', messageId: 'm1', payload: 'ping' });
  assert.equal(summarize([{ rows }]).classPairedMessages, 0);
  rows.push({ runId: 'b', event: 'message_received', scope: 'class', messageId: 'm1', payload: 'ping' });
  assert.equal(summarize([{ rows }]).classPairedMessages, 1);
});
test('markdown escapa HTML y elimina protocolos de enlace ejecutables', () => {
  const rendered = markdown('<script>alert(1)</script>\n\n[mal](javascript:alert)\n\n[bien](P2P.md)');
  assert.ok(!rendered.includes('<script>'));
  assert.ok(!rendered.includes('href="javascript:'));
  assert.ok(rendered.includes('href="P2P.md"'));
});
test('índice y HTML concuerdan con los JSONL reales', async () => {
  const actual = summarize(await scanEvidence());
  const manifest = JSON.parse(await readFile(workspacePath('evidence/manifest.json'), 'utf8'));
  assert.equal(manifest.summary.classPairedMessages, actual.classPairedMessages);
  assert.equal(manifest.summary.kills.length, actual.kills.length);
  assert.equal(manifest.files.length, actual.fileCount);
  const html = await readFile(workspacePath('index.html'), 'utf8');
  for (const file of manifest.files) assert.ok(html.includes(file.path));
});
