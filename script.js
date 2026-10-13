// Mejoras progresivas: el contenido sigue visible sin JavaScript.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const text = (selector, value) => { $(selector).textContent = value; };
const press = (selector, active) => $$(selector).forEach(button => {
  button.setAttribute('aria-pressed', String(button === active));
});
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .04 });
  $$('.concept-card, .diagram, .section-heading').forEach(element => {
    element.classList.add('will-reveal'); observer.observe(element);
  });
}
// Un solo tokenizador preserva el texto y evita insertar HTML del código fuente.
const token = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|await|async|import|from|return|if|else|new|true|false|try|catch|while)\b|\b\d+(?:\.\d+)?\b)/g;
$$('code[data-language]').forEach(element => {
  const source = element.textContent, fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    fragment.append(document.createTextNode(source.slice(cursor, match.index)));
    const span = document.createElement('span');
    const value = match[0];
    span.className = 'syntax-' + (/^(\/\/|#)/.test(value) ? 'comment' : /^["']/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword');
    span.textContent = value; fragment.append(span); cursor = match.index + value.length;
  }
  fragment.append(document.createTextNode(source.slice(cursor))); element.replaceChildren(fragment);
});


let phase = 0, blocks = 0, seeder = true, replica = false;
let logs = ['MODELO / listo para descubrir peers.'];
function log(message) { logs.push(message); text('#p2p-log', logs.slice(-9).join('\n')); }
function render() {
  $('#seeder-node').classList.toggle('offline', !seeder);
  $('#replica-node').classList.toggle('active', replica);
  text('#replica-state', replica ? '4 bloques / copia completa' : 'No participa');
  text('#receiver-blocks', blocks + ' / 4 bloques'); $('#file-progress').value = blocks;
  $$('.blocks span').forEach((block, index) => block.classList.toggle('received', index < blocks));
  $('#kill-seeder').disabled = phase < 2 || !seeder;
  $('#p2p-step').disabled = blocks === 4;
  text('#p2p-step', phase === 0 ? 'Descubrir peers' : phase === 1 ? 'Intercambiar saludo' : blocks === 4 ? 'Archivo completo' : 'Transferir siguiente bloque');
  $('#add-replica').setAttribute('aria-pressed', String(replica));
  text('#add-replica', replica ? 'Retirar réplica completa' : 'Añadir réplica completa');
  text('#p2p-interpretation', blocks === 4 ? 'La copia local está completa: el receptor puede leer sin el seeder original.' : !seeder && !replica ? 'No hay una fuente de los bloques faltantes. La DHT no reconstruye datos ausentes.' : replica ? 'Otra réplica completa puede servir los bloques faltantes si sale el seeder original.' : 'El receptor depende del único seeder para completar los bloques faltantes.');
}
$('#p2p-step').addEventListener('click', () => {
  if (phase === 0) { phase = 1; log('DESCUBRIMIENTO / topic común en DHT (simulado).'); }
  else if (phase === 1) { phase = 2; log('MENSAJES / A → B: Hola, peer. B → A: recibido (simulado).'); }
  else if (seeder || replica) { blocks++; log('BLOQUE ' + blocks + ' / recibido desde ' + (seeder ? 'A' : 'C') + ' (simulado).'); }
  else log('SIN FUENTE / transferencia detenida; faltan ' + (4 - blocks) + ' bloques.');
  render();
});
$('#kill-seeder').addEventListener('click', () => { seeder = false; log('KILL-SEEDER / A abandona el modelo.'); render(); });
$('#add-replica').addEventListener('click', () => { replica = !replica; log(replica ? 'RÉPLICA / C entra con los 4 bloques ya conservados.' : 'RÉPLICA / C abandona el modelo.'); render(); });
$('#p2p-reset').addEventListener('click', () => {
  phase = 0; blocks = 0; seeder = true; replica = false; logs = [];
  log('MODELO / reiniciado, archivo sin descargar.'); render();
});
render();