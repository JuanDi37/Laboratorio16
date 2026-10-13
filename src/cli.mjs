import { args } from './common.mjs';
const options = args();
try {
  if (options.command === 'chat') await (await import('./chat.mjs')).chat(options);
  else if (options.command === 'seed' || options.command === 'download') await (await import('./file.mjs')).transfer(options);
  else {
    console.log('Lab 16 — 20230285\n\nnode src/cli.mjs chat [--carnet ID] [--topic TEXTO] [--timeout MS]\nnode src/cli.mjs seed --file samples/lab16.txt\nnode src/cli.mjs download --key PUBLIC_KEY [--delay 150] [--stay]\n\nLos logs JSONL se guardan automáticamente en evidence/. Ver README.md.');
    if (options.command && options.command !== 'help') process.exitCode = 1;
  }
} catch (err) { console.error(err.message); process.exitCode = 1; }
