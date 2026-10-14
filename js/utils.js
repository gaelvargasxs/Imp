/* Constantes y utilidades compartidas */
const PRODUCTOS = ['Bloc', 'Papel', 'Acrílico', 'Lona', 'Vinil', 'Otro'];

const ETAPAS = [
  { id: 'oficina', label: 'Oficina', tone: 'gray' },
  { id: 'taller', label: 'Taller', tone: 'blue' },
  { id: 'encuadernacion', label: 'Encuadernación', tone: 'orange' },
  { id: 'entrega', label: 'Entrega', tone: 'green' }
];

/* Lista de verificación que el taller debe completar antes de avanzar (evita los errores de la entrevista) */
const CHECKLIST = [
  ['medida', 'Verifiqué la medida'],
  ['numeracion', 'Verifiqué la numeración (del – al)'],
  ['pegado', 'Verifiqué el lado / tipo de pegado'],
  ['material', 'Verifiqué el material'],
  ['presentacion', 'Verifiqué la presentación (bloc / paquetes)']
];

function etapaInfo(id) {
  if (id === 'entregado') return { id, label: 'Entregado', tone: 'green' };
  return ETAPAS.find(e => e.id === id) || { id, label: id, tone: 'gray' };
}

/* Una factura pendiente cuya fecha de vencimiento ya pasó se considera vencida */
function estadoFactura(f) {
  if (f.estado === 'Pagada') return 'Pagada';
  return f.vencimiento < U.today() ? 'Vencida' : 'Pendiente';
}

const U = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  money(n) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0);
  },
  iso(dt) {
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  },
  today() { return U.iso(new Date()); },
  addDays(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    return U.iso(new Date(y, m - 1, d + n));
  },
  diffDays(a, b) {
    const pa = a.slice(0, 10).split('-').map(Number), pb = b.slice(0, 10).split('-').map(Number);
    return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 86400000);
  },
  date(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },
  initials(name) {
    return String(name || '?').split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  },
  badge(text, tone = 'blue') {
    return `<span class="status-badge status-${tone}"><span class="status-dot"></span>${U.esc(text)}</span>`;
  },
  options(list, selected) {
    return list.map(o => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${U.esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${U.esc(l)}</option>`;
    }).join('');
  },
  toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
  },
  modal(title, body, opts = {}) {
    U.closeModal(true);
    const el = document.createElement('div');
    el.className = 'modal-back';
    el.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
      <div class="modal-head"><h2>${U.esc(title)}</h2><button class="icon-button" data-close aria-label="Cerrar">${icon('x', 18)}</button></div>
      <div class="modal-body">${body}</div></div>`;
    el.addEventListener('mousedown', e => { el._down = e.target === el; });
    el.addEventListener('click', e => {
      if ((e.target === el && el._down) || e.target.closest('[data-close]')) U.closeModal();
    });
    document.body.appendChild(el);
    const first = el.querySelector('input:not([type=hidden]),select,textarea');
    if (first) first.focus();
    return el.querySelector('.modal');
  },
  closeModal(silent) {
    document.querySelectorAll('.modal-back').forEach(m => m.remove());
    if (!silent && typeof App !== 'undefined') App.refresh();
  },
  /* Imprime un fragmento HTML (el usuario puede "Guardar como PDF" en el diálogo) */
  print(html) {
    document.getElementById('print-area').innerHTML = html;
    window.print();
  }
};
