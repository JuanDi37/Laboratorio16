const explanations = {
  topic: ['01 / TOPIC', 'Ambos peers deben usar el mismo texto. SHA-256 produce un Buffer de 32 bytes; el topic no es una contraseña, una IP ni un servidor. El propuesto debe confirmarse con el compañero.'],
  dht: ['02 / DHT LOOKUP', 'HyperDHT entra por nodos bootstrap conocidos. Hyperswarm anuncia y busca peers en el topic. Kademlia sirve como modelo: distancia XOR, contactos en k-buckets y lookup progresivo. La DHT no guarda el archivo de este lab.'],
  connect: ['03 / CONNECTION', 'HyperDHT intenta conectar los peers y coordina holepunch cuando hace falta. Hyperswarm entrega un socket Noise cifrado. El programa registra el endpoint observable; una conexión por sí sola no demuestra ruta directa ni ausencia de relay.'],
  exchange: ['04 / EXCHANGE', 'El kickoff envía ping y recibe un ack; cada lado guarda su JSONL. Para archivos se usa otro topic, el discoveryKey del core. Hypercore replica manifest y bloques autenticados; el downloader compara tamaño y SHA-256 antes de guardar.']
};
document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-stage]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  const [label, text] = explanations[button.dataset.stage];
  document.querySelector('#stage-description span').textContent = label;
  document.querySelector('#stage-description p').textContent = text;
}));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  let visible = 0;
  document.querySelectorAll('.evidence-card').forEach(card => {
    const show = button.dataset.filter === 'all' || card.dataset.scope.split(' ').includes(button.dataset.filter);
    card.hidden = !show;
    if (show) visible++;
  });
  document.querySelector('#empty-state').hidden = visible !== 0;
}));
let toastTimer;
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 3500);
}
document.querySelectorAll('.copy').forEach(button => button.addEventListener('click', async () => {
  const text = button.closest('.command').querySelector('code').textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.left = '-9999px';
      document.body.append(area); area.select();
      const copied = document.execCommand('copy'); area.remove();
      if (!copied) throw new Error('Clipboard no disponible');
    }
    toast('Comando copiado');
  } catch {
    const range = document.createRange(); range.selectNodeContents(button.closest('.command').querySelector('code'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    toast('Comando seleccionado. Usa Ctrl+C para copiar.');
  }
}));
document.querySelector('#print-p2p').addEventListener('click', () => {
  document.body.classList.add('print-p2p'); window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-p2p'));
window.addEventListener('beforeprint', () => document.body.classList.add('print-p2p'));
