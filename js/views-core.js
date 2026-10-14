/* Vistas: Dashboard y Clientes. V = vistas, A = acciones (data-action), F = formularios (data-form), C = cambios (data-change) */
const V = {}, A = {}, F = {}, C = {};
const D = DB.data;

function pageTitle(title, desc, action = '') {
  return `<div class="page-heading compact"><div><h1>${title}</h1><p class="muted">${desc}</p></div>${action}</div>`;
}
function searchBar(ph, target) {
  return `<div class="search-bar">${icon('search')}<input placeholder="${ph}" aria-label="${ph}" data-filter="${target}"></div>`;
}
const clienteById = id => D.clientes.find(c => c.id === id);
const short = n => n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + Math.round(n);

/* ======================= DASHBOARD ======================= */
V.dashboard = () => {
  const hoy = U.today();
  const activas = D.ordenes.filter(o => o.etapa !== 'entregado');
  const urgentes = activas.filter(o => o.urgente).length;
  const cotPend = D.cotizaciones.filter(q => q.estado === 'Borrador' || q.estado === 'Enviada');
  const entPend = D.entregas.filter(e => e.estado === 'Pendiente');
  const entHoy = entPend.filter(e => e.fecha <= hoy);
  const porVencer = D.facturas.filter(f => estadoFactura(f) === 'Pendiente' && f.vencimiento <= U.addDays(hoy, 7));
  const montoPV = porVencer.reduce((s, f) => s + Number(f.monto), 0);

  const metrics = [
    ['Órdenes en proceso', activas.length, `${urgentes} urgentes`, 'clipboard', 'blue', '#/seguimiento'],
    ['Cotizaciones pendientes', cotPend.length, 'Borrador o enviadas', 'fileText', 'purple', '#/cotizaciones'],
    ['Entregas de hoy', entHoy.length, `${entPend.length} pendientes en total`, 'truck', 'orange', '#/entregas'],
    ['Facturas por vencer', porVencer.length, U.money(montoPV) + ' en 7 días', 'receipt', 'green', '#/facturas']
  ].map(([l, v, d, ic, tone, href]) => `
    <div class="metric-card clickable" data-action="goto" data-href="${href}">
      <div class="metric-icon metric-${tone}">${icon(ic, 19)}</div>
      <div class="metric-label">${l}</div><div class="metric-value">${v}</div><div class="metric-detail">${d}</div>
      <span class="metric-arrow">${icon('arrowUpRight', 16)}</span></div>`).join('');

  // Ventas (facturado) de los últimos 6 meses
  const now = new Date(), meses = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    const total = D.facturas.filter(f => (f.fechaEmision || '').startsWith(key)).reduce((s, f) => s + Number(f.monto), 0);
    meses.push({ label: dt.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''), total });
  }
  const max = Math.max(...meses.map(m => m.total), 1);
  const bars = meses.map(m => `<div class="bar-column" title="${U.money(m.total)}"><div class="bar" style="height:${Math.max(m.total / max * 100, 2)}%"></div><span>${m.label}</span></div>`).join('');

  const bajos = D.materiales.filter(m => Number(m.existencia) <= Number(m.minimo)).slice(0, 5);
  const stock = bajos.length ? bajos.map(m => {
    const critico = Number(m.existencia) < Number(m.minimo) / 2;
    return `<div class="stock-item"><div class="stock-symbol ${critico ? 'stock-red' : 'stock-orange'}">${icon('alert', 16)}</div>
      <div><strong>${U.esc(m.nombre)}</strong><small>${m.existencia} ${U.esc(m.unidad)} (mín. ${m.minimo})</small></div>${U.badge(critico ? 'Crítico' : 'Bajo', critico ? 'red' : 'orange')}</div>`;
  }).join('') : '<div class="price-placeholder">Todo el inventario está por encima del mínimo.</div>';

  const ultimas = D.ordenes.slice().sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || '')).slice(0, 5);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return `<div class="page-content">
    <div class="page-heading"><div><p class="eyebrow">${fecha}</p><h1>${saludo}, ${U.esc(App.user.nombre.split(' ')[0])}</h1><p class="muted">Aquí tienes un resumen de la operación de hoy.</p></div>
      <a class="btn btn-primary" href="#/cotizaciones/nueva">${icon('plus', 16)}Nueva cotización</a></div>
    <div class="metric-grid">${metrics}</div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2>Ventas por mes</h2><p class="muted">Facturado en los últimos 6 meses</p></div></div>
        <div class="chart-area"><div class="chart-y"><span>${short(max)}</span><span>${short(max * 2 / 3)}</span><span>${short(max / 3)}</span><span>$0</span></div>
        <div class="chart"><div class="grid-lines"><i></i><i></i><i></i><i></i></div><div class="bars">${bars}</div></div></div></section>
      <section class="panel"><div class="panel-header"><div><h2>Materiales con stock bajo</h2><p class="muted">Requieren reposición</p></div>
        <a class="text-button" href="#/inventario">Ver inventario ${icon('arrowUpRight', 14)}</a></div><div class="stock-list">${stock}</div></section>
    </div>
    <section class="panel orders-panel"><div class="panel-header"><div><h2>Últimas órdenes</h2><p class="muted">Órdenes creadas recientemente</p></div>
      <a class="text-button" href="#/seguimiento">Ver todas ${icon('arrowUpRight', 14)}</a></div>${ordenesTable(ultimas)}</section>
  </div>`;
};

/* ======================= CLIENTES ======================= */
V.clientes = args => {
  if (args[0]) return clienteFicha(args[0]);
  const rows = D.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(c => {
    const n = D.ordenes.filter(o => o.clienteId === c.id).length;
    return `<tr class="clickable" data-action="goto" data-href="#/clientes/${c.id}">
      <td data-label="Cliente"><div class="client-cell"><div class="client-avatar">${U.initials(c.nombre)}</div><strong>${U.esc(c.nombre)}</strong></div></td>
      <td data-label="Correo">${U.esc(c.correo)}</td>
      <td data-label="Teléfono">${U.esc(c.telefono)}</td>
      <td data-label="Trabajos">${n} trabajos</td>
      <td data-label="Estado">${U.badge(c.estado || 'Activo', 'green')}</td>
      <td class="row-actions"><span class="btn btn-sm">Ver ficha</span></td></tr>`;
  }).join('');
  return `<div class="page-content">
    ${pageTitle('Clientes', 'Administra la información y el historial de tus clientes.',
      `<button class="btn btn-primary" data-action="nuevoCliente">${icon('plus', 16)}Nuevo cliente</button>`)}
    <section class="panel table-panel"><div class="toolbar">${searchBar('Buscar por nombre o correo...', '#t-clientes')}</div>
      <div class="table-wrap"><table id="t-clientes"><thead><tr><th>Cliente</th><th>Correo electrónico</th><th>Teléfono</th><th>Trabajos</th><th>Estado</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty-row">Aún no hay clientes. Crea el primero.</td></tr>'}</tbody></table></div></section></div>`;
};

function clienteFicha(id) {
  const c = clienteById(id);
  if (!c) return `<div class="page-content"><p>Cliente no encontrado. <a href="#/clientes">Volver</a></p></div>`;
  const cots = D.cotizaciones.filter(q => q.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ords = D.ordenes.filter(o => o.clienteId === id).sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
  const tono = { Borrador: 'gray', Enviada: 'blue', Autorizada: 'green', Rechazada: 'red' };

  const hist = cots.map(q => {
    const o = D.ordenes.find(x => x.id === q.ordenId);
    const dias = o && o.fechaEntregado ? U.diffDays(o.fechaCreacion, o.fechaEntregado) + ' días' : '—';
    return `<tr>
      <td data-label="Fecha">${U.date(q.fecha)}</td>
      <td data-label="Folio" class="order-id">${q.folio}</td>
      <td data-label="Producto">${U.esc(q.producto)}</td>
      <td data-label="Cantidad">${q.cantidad}</td>
      <td data-label="Material">${U.esc(q.material)}</td>
      <td data-label="Precio"><strong>${U.money(q.precio)}</strong></td>
      <td data-label="P. unitario">${U.money(q.precio / (q.cantidad || 1))}</td>
      <td data-label="Producción">${dias}</td>
      <td data-label="Estado">${U.badge(q.estado, tono[q.estado])}</td>
    </tr>`;
  }).join('');

  return `<div class="page-content">
    <a class="back-link" href="#/clientes">${icon('arrowLeft', 15)} Volver a clientes</a>
    ${pageTitle(U.esc(c.nombre), 'Ficha del cliente e historial de trabajos y precios.',
      `<div class="button-row"><button class="btn" data-action="editarCliente" data-id="${c.id}">${icon('edit', 15)}Editar</button>
       <a class="btn btn-primary" href="#/cotizaciones/nueva?cliente=${c.id}">${icon('plus', 16)}Nueva cotización</a></div>`)}
    <div class="client-layout">
      <section class="panel info-card"><div class="panel-header"><div><h2>Datos del cliente</h2></div>${U.badge(c.estado || 'Activo', 'green')}</div>
        <dl class="info-list">
          <dt>Contacto</dt><dd>${U.esc(c.contacto || '—')}</dd>
          <dt>Correo</dt><dd>${U.esc(c.correo || '—')}</dd>
          <dt>Teléfono</dt><dd>${U.esc(c.telefono || '—')}</dd>
          <dt>Almacén de entrega</dt><dd>${U.esc(c.direccion || '—')}</dd>
          <dt>Horario de entrega</dt><dd>${U.esc(c.horarioEntrega || '—')}</dd>
          <dt>Plazo de pago</dt><dd>${c.plazoPago || 0} días</dd>
        </dl></section>
      <div>
        <section class="panel table-panel"><div class="panel-header"><div><h2>Historial de cotizaciones y precios</h2><p class="muted">Base para recotizar respetando precios anteriores</p></div></div>
          <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Folio</th><th>Producto</th><th>Cant.</th><th>Material</th><th>Precio</th><th>P. unitario</th><th>Producción</th><th>Estado</th></tr></thead>
          <tbody>${hist || '<tr><td colspan="9" class="empty-row">Sin cotizaciones todavía.</td></tr>'}</tbody></table></div></section>
        <section class="panel orders-panel" style="margin-top:18px"><div class="panel-header"><div><h2>Órdenes de trabajo</h2></div></div>${ordenesTable(ords)}</section>
      </div></div></div>`;
}

/* ---- Acciones de clientes ---- */
function formCliente(c = {}) {
  return `<form data-form="cliente" class="form-grid modal-form">
    <input type="hidden" name="id" value="${U.esc(c.id || '')}">
    <label class="full">Nombre del cliente<input name="nombre" required value="${U.esc(c.nombre || '')}"></label>
    <label>Persona de contacto<input name="contacto" value="${U.esc(c.contacto || '')}"></label>
    <label>Teléfono<input name="telefono" value="${U.esc(c.telefono || '')}"></label>
    <label class="full">Correo electrónico<input type="email" name="correo" value="${U.esc(c.correo || '')}"></label>
    <label class="full">Almacén / dirección de entrega<input name="direccion" value="${U.esc(c.direccion || '')}"></label>
    <label>Horario de entrega<input name="horarioEntrega" placeholder="Lun–Vie 9:00–13:00" value="${U.esc(c.horarioEntrega || '')}"></label>
    <label>Plazo de pago (días)<input type="number" min="0" name="plazoPago" value="${c.plazoPago ?? 30}"></label>
    <div class="full modal-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-primary">Guardar cliente</button></div></form>`;
}
A.nuevoCliente = () => U.modal('Nuevo cliente', formCliente());
A.editarCliente = ({ id }) => U.modal('Editar cliente', formCliente(clienteById(id)));
F.cliente = async form => {
  const f = Object.fromEntries(new FormData(form));
  const obj = { nombre: f.nombre.trim(), contacto: f.contacto, telefono: f.telefono, correo: f.correo, direccion: f.direccion, horarioEntrega: f.horarioEntrega, plazoPago: Number(f.plazoPago) || 0, estado: 'Activo' };
  if (f.id) await DB.update('clientes', f.id, obj); else await DB.add('clientes', obj);
  U.toast('Cliente guardado');
  U.closeModal();
};
