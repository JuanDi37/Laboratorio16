import { mkdir, writeFile } from 'node:fs/promises';
import { workspacePath, sha256 } from '../src/common.mjs';
export async function makeSample() {
  const text = 'PactTrail / Lab16: material sintetico propio. Tarea de ejemplo completada; esto no representa un contrato, persona ni pago real.\n';
  const size = 786432;
  const data = Buffer.alloc(size);
  const source = Buffer.from(text);
  for (let i = 0; i < size; i++) data[i] = source[i % source.length];
  await mkdir(workspacePath('samples'), { recursive: true });
  await writeFile(workspacePath('samples/lab16.txt'), data);
  const metadata = { path: 'samples/lab16.txt', size, sha256: sha256(data), content: 'Texto sintético propio, sin PII ni material ajeno' };
  await writeFile(workspacePath('samples/sample.json'), JSON.stringify(metadata, null, 2));
  return metadata;
}
if (process.argv[1]?.endsWith('sample.mjs')) console.log(JSON.stringify(await makeSample(), null, 2));
