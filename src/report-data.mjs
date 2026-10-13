import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { ROOT, workspacePath } from './common.mjs';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function scanEvidence(directory = workspacePath('evidence')) {
  const logs = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name === 'private') continue;
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.jsonl')) {
        const metadata = await stat(path);
        if (metadata.size > 10_000_000) continue;
        const raw = await readFile(path, 'utf8');
        const rows = [], parseErrors = [];
        raw.split(/\r?\n/).forEach((line, i) => {
          if (!line.trim()) return;
          try { const value = JSON.parse(line); if (!value || typeof value !== 'object') throw new Error('Registro inválido'); rows.push(value); }
          catch { parseErrors.push(i + 1); }
        });
        logs.push({ path: relative(ROOT, path).replaceAll('\\', '/'), bytes: metadata.size, rows, parseErrors });
      }
    }
  }
  await walk(directory);
  return logs.sort((a, b) => a.path.localeCompare(b.path));
}

export function summarize(logs) {
  const rows = logs.flatMap(log => log.rows);
  const byRun = new Map();
  for (const row of rows) {
    if (!row.runId) continue;
    if (!byRun.has(row.runId)) byRun.set(row.runId, []);
    byRun.get(row.runId).push(row);
  }
  const topicOf = run => byRun.get(run)?.find(row => row.event === 'join')?.topicId;
  const sent = rows.filter(row => row.event === 'message_sent');
  const received = rows.filter(row => row.event === 'message_received');
  const matched = sent.filter(s => received.some(r => r.messageId === s.messageId && r.payload === s.payload && r.runId !== s.runId && r.scope === s.scope && topicOf(r.runId) && topicOf(r.runId) === topicOf(s.runId)));
  const classroom = rows.filter(row => row.scope === 'class');
  const local = rows.filter(row => row.scope === 'local-automated');
  const kill = rows.filter(row => row.event === 'kill_seeder');
  return {
    fileCount: logs.length,
    classConnections: classroom.filter(row => row.event === 'connection').length,
    classReceived: classroom.filter(row => row.event === 'message_received').length,
    classPairedMessages: matched.filter(row => row.scope === 'class').length,
    localConnections: local.filter(row => row.event === 'connection').length,
    localPairedMessages: matched.filter(row => row.scope === 'local-automated').length,
    classTransfers: classroom.filter(row => row.event === 'transfer_complete' && row.verified === true).length,
    localTransfers: local.filter(row => row.event === 'transfer_complete' && row.verified === true).length,
    classTimeouts: classroom.filter(row => row.event === 'timeout').length,
    preparationFailures: rows.filter(row => row.scope === 'preparation' && ['install_failed', 'dependency_missing'].includes(row.event)).length,
    kills: kill,
    scenarios: rows.filter(row => row.event === 'scenario_result'),
    runs: [...byRun.entries()].map(([runId, entries]) => ({ runId, scope: entries[0].scope, role: entries[0].role, first: entries[0].timestamp, topicId: topicOf(runId), connections: entries.filter(r => r.event === 'connection').length, received: entries.filter(r => r.event === 'message_received').length })),
    lastCheck: rows.filter(row => row.event === 'checks_complete').at(-1) ?? null
  };
}

export function markdown(source) {
  const inline = text => escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (all, title, url) => {
      if (!/^(https?:\/\/|(?:[\w.-]+\/)*[\w.-]+(?:#[\w-]+)?)$/i.test(url)) return title;
      return `<a href="${url}">${title}</a>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const output = [];
  let paragraph = [], list = false;
  const flush = () => { if (paragraph.length) { output.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
  const closeList = () => { if (list) { output.push('</ul>'); list = false; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flush(); closeList(); const code = [];
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    } else if (/^#{1,6} /.test(line)) {
      flush(); closeList(); const level = Math.min(line.match(/^#+/)[0].length + 1, 6);
      output.push(`<h${level}>${inline(line.replace(/^#+ /, ''))}</h${level}>`);
    } else if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) {
      flush(); closeList(); const cells = row => row.split('|').slice(1, -1).map(c => c.trim());
      output.push(`<div class="table-scroll"><table><thead><tr>${cells(line).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`);
      i += 2;
      while (i < lines.length && lines[i].startsWith('|')) { output.push(`<tr>${cells(lines[i]).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`); i++; }
      i--;
      output.push('</tbody></table></div>');
    } else if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      flush(); if (!list) { output.push('<ul>'); list = true; }
      output.push(`<li>${inline(line.replace(/^(?:[-*]|\d+\.) /, ''))}</li>`);
    } else if (!line.trim()) { flush(); closeList(); }
    else paragraph.push(line);
  }
  flush(); closeList(); return output.join('\n');
}
