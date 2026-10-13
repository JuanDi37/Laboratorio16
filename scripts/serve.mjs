import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { ROOT, number } from '../src/common.mjs';

const port = number(process.env.LAB16_PORT, 8080, 1024, 65535);
const dirs = new Set(['web', 'src', 'scripts', 'samples', 'evidence']);
const files = new Set(['index.html', 'P2P.md', 'README.md', 'KILL-SEEDER.md', 'VENTURE.md', 'REFLEXIONES.md', 'lab.config.json', 'package.json', 'package-lock.json']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jsonl': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const rootReal = await realpath(ROOT);
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Solo GET/HEAD'); return; }
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const segments = path.split(/[\\/]/);
    if (segments.some(s => s.startsWith('.') || s === 'private') || (!files.has(path) && !dirs.has(segments[0]))) { res.writeHead(403); res.end('Ruta privada'); return; }
    const file = resolve(ROOT, path);
    const resolved = await realpath(file);
    const rel = relative(rootReal, resolved);
    if (rel === '..' || rel.startsWith(`..${sep}`) || /^[A-Za-z]:/.test(rel) || !(await stat(resolved)).isFile()) { res.writeHead(403); res.end('Ruta no permitida'); return; }
    const data = await readFile(resolved);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) { res.writeHead(err instanceof URIError ? 400 : 404); res.end('Archivo no encontrado'); }
});
server.on('error', err => { console.error(err.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Informe: http://127.0.0.1:${port}\nCtrl+C para cerrar. Este servidor no transporta datos P2P.`));
