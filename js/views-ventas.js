/* Vistas: Cotizaciones, Órdenes de trabajo y Seguimiento (Kanban) */
const TONO_COT = { Borrador: 'gray', Enviada: 'blue', Autorizada: 'green', Rechazada: 'red' };
const ESTADOS_COT = ['Borrador', 'Enviada', 'Autorizada', 'Rechazada'];

const checklistProgreso = o => {
  const c = o.checklist || {};
  return { done: CHECKLIST.filter(([k]) => c[k]).length, total: CHECKLIST.length };
};
const checklistCompleta = o => { const p = checklistProgreso(o); return p.done === p.total; };

/* ======================= COTIZACIONES ======================= */
V.cotizaciones = (args, q) => {
  if (args[0] === 'nueva') return cotForm(q);
  const rows = D.cotizaciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio)).map(c => `
    <tr><td data-label="Folio" class="order-id">${c.folio}</td>
      <td data-label="Cliente"><strong>${U.esc(c.clienteNombre)}</strong></td>
      <td data-label="Producto">${U.esc(c.producto)}</td>
      <td data-label="Cantidad">${c.cantidad}</td>
      <td data-label="Precio"><strong>${U.money(c.precio)}</strong></td>
      <td data-label="Fecha">${U.date(c.fecha)}</td>
      <td data-label="Estado"><select class="inline-input status-select" data-change="estadoCot" data-id="${c.id}" aria-label="Estado de ${c.folio}">${U.options(ESTADOS_COT, c.estado)}</select></td>
      <td class="row-actions">
        <button class="btn btn-sm" data-action="printCot" data-id="${c.id}" title="Generar PDF">${icon('printer', 14)}PDF</button>
        ${c.estado === 'Autorizada' && !c.ordenId ? `<a class="btn btn-sm btn-primary" href="#/ordenes/nueva?cot=${c.id}">Crear orden</a>` : ''}
        ${c.ordenId ? U.badge('Con orden', 'green') : ''}
        <button class="btn btn-sm btn-danger" data-action="borrarCot" data-id="${c.id}" aria-label="Eliminar ${c.folio}">${icon('trash', 14)}</button>
      </td></tr>`).join('');
  return `<div class="page-content">
    ${pageTitle('Cotizaciones', 'Cotizaciones enviadas, autorizadas y rechazadas.', `<a class="btn btn-primary" href="#/cotizaciones/nueva">${icon('plus', 16)}Nueva cotización</a>`)}
    <section class="panel table-panel"><div class="toolbar">${searchBar('Buscar por folio, cliente o producto...', '#t-cot')}</div>
    <div class="table-wrap"><table id="t-cot"><thead><tr><th>Folio</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" class="empty-row">No hay cotizaciones.</td></tr>'}</tbody></table></div></section></div>`;
};

function cotForm(q) {
  const pre = q.get('cliente') || '';
  const clientes = U.options([['', 'Selecciona un cliente'], ...D.clientes.map(c => [c.id, c.nombre])], pre);
  const mats = U.options([...D.materiales.map(m => m.nombre), 'Otro / sin material']);
  const html = `<div class="page-content">
    ${pageTitle('Nueva cotización', 'Crea una propuesta de trabajo para tu cliente.')}
    <form id="form-cot" data-form="cotizacion"><div class="form-layout">
      <section class="panel form-panel"><div class="panel-header"><div><h2>Información de la cotización</h2><p class="muted">Completa los datos principales del trabajo.</p></div></div>
        <div class="form-grid">
          <label>Cliente<select name="clienteId" required>${clientes}</select></label>
          <label>Fecha<input type="date" name="fecha" value="${U.today()}" required></label>
          <label>Producto<select name="producto">${U.options(PRODUCTOS)}</select></label>
          <label>Estado<select name="estado">${U.options(ESTADOS_COT, 'Enviada')}</select></label>
          <label>Cantidad<input type="number" min="1" name="cantidad" placeholder="Ej. 500" required></label>
          <label>Medida<input name="medida" placeholder="Ej. 21 x 28 cm"></label>
          <label>Material<select name="material">${mats}</select></label>
          <label>Precio total (MXN)<input type="number" min="0" step="0.01" name="precio" placeholder="0.00" required></label>
          <label class="full">Orden de compra del cliente (si ya la envió)<input name="ordenCompra"></label>
          <label class="full">Notas<textarea name="notas" rows="3" placeholder="Especificaciones o notas para el cliente..."></textarea></label>
        </div>
        <div class="form-actions"><a class="btn" href="#/cotizaciones">Cancelar</a>
          <button class="btn" name="accion" value="guardar">Guardar</button>
          <button class="btn btn-primary" name="accion" value="pdf">${icon('fileText', 15)}Guardar y generar PDF</button></div>
      </section>
      <aside class="panel price-card"><div class="price-card-icon">${icon('clock', 18)}</div><h2>Último precio cotizado</h2>
        <p class="muted">Respeta los precios anteriores para que el cliente autorice sin buscar otras cotizaciones.</p><div id="price-body"></div></aside>
    </div></form></div>`;
  return { html, form: true, mount: root => {
    const f = root.querySelector('#form-cot');
    const upd = () => renderPriceCard(f);
    f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  } };
}

function renderPriceCard(f) {
  const box = document.getElementById('price-body');
  const cid = f.elements.clienteId.value, prod = f.elements.producto.value;
  if (!cid) { box.innerHTML = '<div class="price-placeholder">Selecciona un cliente para ver su historial de precios.</div>'; return; }
  const prev = D.cotizaciones.filter(q => q.clienteId === cid && q.producto === prod && q.estado !== 'Rechazada').sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!prev.length) { box.innerHTML = `<div class="price-placeholder">Este cliente no tiene cotizaciones previas de «${U.esc(prod)}».</div>`; return; }
  const l = prev[0], unit = l.precio / (l.cantidad || 1);
  const cant = Number(f.elements.cantidad.value) || 0, actual = Number(f.elements.precio.value) || 0;
  const sugerido = cant ? Math.round(unit * cant * 100) / 100 : l.precio;
  let aviso = '';
  if (actual > 0 && cant > 0) {
    const dif = (actual / cant - unit) / unit * 100;
    aviso = Math.abs(dif) < 0.5
      ? `<div class="price-ok">${icon('check', 14)} Mismo precio unitario que la última vez.</div>`
      : `<div class="price-alert">${icon('alert', 14)} ${dif > 0 ? 'Subiste' : 'Bajaste'} el precio unitario un ${Math.abs(dif).toFixed(1)}%.${dif > 0 ? ' El cliente podría buscar otras cotizaciones.' : ''}</div>`;
  }
  const hist = prev.slice(0, 4).map(p => `<tr><td>${U.date(p.fecha)}</td><td>${p.cantidad}</td><td>${U.money(p.precio)}</td></tr>`).join('');
  box.innerHTML = `<div class="last-price"><span class="muted">${U.date(l.fecha)} · ${l.folio}</span><strong>${U.money(l.precio)}</strong>
      <span>${l.cantidad} pzas · ${U.money(unit)} c/u</span><span class="muted">${U.esc(l.material)} · ${U.esc(l.medida)}</span></div>
    ${aviso}
    <button type="button" class="btn btn-sm full-btn" data-action="usarPrecio" data-precio="${sugerido}" data-medida="${U.esc(l.medida)}" data-material="${U.esc(l.material)}">Usar datos anteriores (${U.money(sugerido)})</button>
    <table class="mini-table"><thead><tr><th>Fecha</th><th>Cant.</th><th>Precio</th></tr></thead><tbody>${hist}</tbody></table>`;
}
A.usarPrecio = ({ precio, medida, material }) => {
  const f = document.getElementById('form-cot');
  f.elements.precio.value = precio;
  if (!f.elements.medida.value) f.elements.medida.value = medida;
  if ([...f.elements.material.options].some(o => o.value === material)) f.elements.material.value = material;
  renderPriceCard(f);
};

F.cotizacion = async (form, e) => {
  const f = Object.fromEntries(new FormData(form));
  const cli = clienteById(f.clienteId);
  if (!cli) { U.toast('Selecciona un cliente', 'error'); return; }
  const obj = { folio: DB.nextFolio('cotizaciones', 'COT-'), clienteId: cli.id, clienteNombre: cli.nombre, producto: f.producto, cantidad: Number(f.cantidad), medida: f.medida, material: f.material, precio: Number(f.precio), estado: f.estado, fecha: f.fecha, ordenCompra: f.ordenCompra, notas: f.notas, ordenId: '' };
  await DB.add('cotizaciones', obj);
  U.toast('Cotización ' + obj.folio + ' guardada');
  if (e && e.submitter && e.submitter.value === 'pdf') printCotObj(obj);
  location.hash = '#/cotizaciones';
};
C.estadoCot = async ({ id }, el) => { await DB.update('cotizaciones', id, { estado: el.value }); U.toast('Estado actualizado'); };
A.borrarCot = async ({ id }) => {
  const c = DB.get('cotizaciones', id);
  if (confirm('¿Eliminar la cotización ' + c.folio + '?')) { await DB.remove('cotizaciones', id); U.toast('Cotización eliminada'); }
};
function printCotObj(c) {
  const cli = clienteById(c.clienteId) || {};
  U.print(`<div class="doc"><div class="doc-head"><div><h1>Imprenta Regional</h1><p>Cotización</p></div><div class="doc-folio"><strong>${c.folio}</strong><span>${U.date(c.fecha)}</span></div></div>
    <p><strong>Cliente:</strong> ${U.esc(c.clienteNombre)}<br>${U.esc(cli.contacto || '')}</p>
    <table class="doc-table"><thead><tr><th>Producto</th><th>Medida</th><th>Material</th><th>Cantidad</th><th>P. unitario</th><th>Total</th></tr></thead>
    <tbody><tr><td>${U.esc(c.producto)}</td><td>${U.esc(c.medida)}</td><td>${U.esc(c.material)}</td><td>${c.cantidad}</td><td>${U.money(c.precio / c.cantidad)}</td><td><strong>${U.money(c.precio)}</strong></td></tr></tbody></table>
    ${c.notas ? `<p><strong>Notas:</strong> ${U.esc(c.notas)}</p>` : ''}
    <p class="doc-note">Vigencia de la cotización: 15 días. Para iniciar el trabajo, favor de enviar su orden de compra y confirmar si habrá cambios de diseño o si requiere prueba.</p></div>`);
}
A.printCot = ({ id }) => printCotObj(DB.get('cotizaciones', id));

/* ======================= ÓRDENES DE TRABAJO ======================= */
function ordenesTable(list) {
  const hoy = U.today();
  const rows = list.map(o => {
    const e = etapaInfo(o.etapa);
    const atras = o.etapa !== 'entregado' && o.fechaEntrega < hoy;
    return `<tr class="clickable" data-action="verOrden" data-id="${o.id}">
      <td data-label="Orden"><strong class="order-id">${o.folio}</strong></td>
      <td data-label="Cliente"><strong>${U.esc(o.clienteNombre)}</strong></td>
      <td data-label="Producto">${U.esc(o.producto)} · ${o.cantidad}</td>
      <td data-label="Estado">${U.badge(e.label, e.tone)}</td>
      <td data-label="Entrega"><span class="date-cell">${icon('calendar', 14)}${U.date(o.fechaEntrega)}${atras ? ' ' + U.badge('Atrasada', 'red') : ''}</span></td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Orden</th><th>Cliente</th><th>Producto</th><th>Estado</th><th>Entrega</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="empty-row">Sin órdenes.</td></tr>'}</tbody></table></div>`;
}

V.ordenes = (args, q) => {
  if (args[0] === 'nueva') return ordenForm(q);
  const list = D.ordenes.slice().sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
  const nueva = App.user.rol === 'oficina' ? `<a class="btn btn-primary" href="#/ordenes/nueva">${icon('plus', 16)}Nueva orden</a>` : '';
  return `<div class="page-content">${pageTitle('Órdenes de trabajo', 'Crea y administra las órdenes de producción.', nueva)}
    <section class="panel table-panel">${ordenesTable(list)}</section></div>`;
};

function diasProduccionCliente(cid) {
  const l = D.ordenes.filter(o => o.clienteId === cid && o.fechaEntregado && o.fechaCreacion).map(o => U.diffDays(o.fechaCreacion, o.fechaEntregado));
  return l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null;
}

function ordenForm(q) {
  const cot = DB.get('cotizaciones', q.get('cot') || '');
  const v = cot || {};
  const chk = (name, label, on) => `<label class="check"><input type="checkbox" name="${name}"${on ? ' checked' : ''}> ${label}</label>`;
  const html = `<div class="page-content">
    ${pageTitle('Nueva orden de trabajo', cot ? `Generada desde la cotización ${cot.folio}.` : 'Completa todos los campos con cuidado: una orden bien hecha evita errores en el taller.')}
    <form id="form-orden" data-form="orden"><section class="panel form-panel"><div class="panel-header"><div><h2>Datos de la orden</h2><p class="muted">Esta información llegará al taller tal cual.</p></div></div>
      <div class="form-grid">
        <label>Cliente<select name="clienteId" required>${U.options([['', 'Selecciona un cliente'], ...D.clientes.map(c => [c.id, c.nombre])], v.clienteId || '')}</select></label>
        <label>Número de orden de compra<input name="ordenCompra" value="${U.esc(v.ordenCompra || '')}" placeholder="Ej. OC-1234"></label>
        <label>Producto<select name="producto">${U.options(PRODUCTOS, v.producto)}</select></label>
        <label>Cantidad<input type="number" min="1" name="cantidad" required value="${v.cantidad || ''}"></label>
        <label>Medida<input name="medida" required value="${U.esc(v.medida || '')}" placeholder="Ej. 21 x 28 cm"></label>
        <label>Material<select name="material">${U.options([...D.materiales.map(m => m.nombre), 'Otro / sin material'], v.material)}</select></label>
        <label>Numeración: del<input type="number" min="0" name="numDel" placeholder="Ej. 1"></label>
        <label>Numeración: al<input type="number" min="0" name="numAl" placeholder="Ej. 500"></label>
        <label>Tipo / lado de pegado<select name="pegado">${U.options(['Sin pegado', 'Pegado por cabeza', 'Pegado por lado izquierdo', 'Pegado por pie'])}</select></label>
        <label>Presentación<select name="presentacion">${U.options(['Bloc', 'Paquetes', 'Pliegos sueltos', 'Rollo'])}</select></label>
        <label>Placa / formato<select name="placa">${U.options(['Placa existente en archivo', 'Placa nueva (hay que elaborarla)'])}</select></label>
        <label>Consumo estimado de material<input type="number" min="0" step="0.01" name="consumo" value="0"></label>
        <label>Precio acordado (MXN)<input type="number" min="0" step="0.01" name="precio" required value="${v.precio || ''}"></label>
        <label>Fecha de entrega<input type="date" name="fechaEntrega" required value="${U.addDays(U.today(), 5)}"><small class="muted" id="hint-fecha"></small></label>
        <div class="full check-row">
          ${chk('requierePrueba', 'El cliente solicitó prueba de diseño', false)}
          ${chk('disenoAutorizado', 'Diseño autorizado por el cliente', true)}
          ${chk('urgente', 'Trabajo urgente', false)}
        </div>
        <label class="full">Notas para el taller<textarea name="notas" rows="3"></textarea></label>
      </div>
      <div class="form-actions"><a class="btn" href="#/ordenes">Cancelar</a><button class="btn btn-primary">${icon('check', 15)}Crear orden de trabajo</button></div>
    </section><input type="hidden" name="cotizacionId" value="${cot ? cot.id : ''}"></form></div>`;
  return { html, form: true, mount: root => {
    const f = root.querySelector('#form-orden'), hint = f.querySelector('#hint-fecha');
    const upd = () => {
      const n = diasProduccionCliente(f.elements.clienteId.value);
      if (n != null) { f.elements.fechaEntrega.value = U.addDays(U.today(), n); hint.textContent = `Sugerida según historial: ${n} días de producción promedio.`; } else hint.textContent = '';
    };
    f.elements.clienteId.addEventListener('change', upd);
    if (f.elements.clienteId.value) upd();
  } };
}

F.orden = async form => {
  const f = Object.fromEntries(new FormData(form));
  const cli = clienteById(f.clienteId);
  if (!cli) { U.toast('Selecciona un cliente', 'error'); return; }
  if (f.numDel !== '' && f.numAl !== '' && Number(f.numAl) < Number(f.numDel)) { U.toast('La numeración final no puede ser menor que la inicial', 'error'); return; }
  const ahora = new Date().toISOString();
  const obj = {
    folio: DB.nextFolio('ordenes', 'OT-'), clienteId: cli.id, clienteNombre: cli.nombre, cotizacionId: f.cotizacionId, ordenCompra: f.ordenCompra,
    producto: f.producto, cantidad: Number(f.cantidad), medida: f.medida, material: f.material, numDel: f.numDel, numAl: f.numAl,
    pegado: f.pegado, presentacion: f.presentacion, placa: f.placa, consumo: Number(f.consumo) || 0, consumoDescontado: false,
    precio: Number(f.precio), fechaEntrega: f.fechaEntrega, fechaCreacion: U.today(), requierePrueba: !!f.requierePrueba,
    disenoAutorizado: !!f.disenoAutorizado, urgente: !!f.urgente, notas: f.notas, etapa: 'oficina',
    checklist: { medida: false, numeracion: false, pegado: false, material: false, presentacion: false },
    historial: [{ etapa: 'oficina', fecha: ahora, usuario: App.user.nombre }]
  };
  const id = await DB.add('ordenes', obj);
  if (f.cotizacionId) await DB.update('cotizaciones', f.cotizacionId, { ordenId: id });
  U.toast('Orden ' + obj.folio + ' creada');
  location.hash = '#/seguimiento';
};

/* ---- Detalle de orden (modal) ---- */
function ordenDetalle(o) {
  const e = etapaInfo(o.etapa), c = o.checklist || {};
  const puedeChk = o.etapa !== 'entregado';
  const checks = CHECKLIST.map(([k, l]) => `<label class="check big"><input type="checkbox" data-change="check" data-id="${o.id}" data-key="${k}"${c[k] ? ' checked' : ''}${puedeChk ? '' : ' disabled'}> ${l}</label>`).join('');
  const hist = (o.historial || []).slice().reverse().map(h => `<li><strong>${etapaInfo(h.etapa).label}</strong> · ${U.esc(h.usuario)} <span class="muted">${U.dateTime(h.fecha)}</span></li>`).join('');
  const num = o.numDel !== '' && o.numDel != null ? `${o.numDel} al ${o.numAl}` : 'Sin numeración';
  return `<div class="detail-top">${U.badge(e.label, e.tone)}${o.urgente ? U.badge('Urgente', 'orange') : ''}${o.requierePrueba && !o.disenoAutorizado ? U.badge('Diseño sin autorizar', 'red') : ''}</div>
    <dl class="info-list two">
      <dt>Orden de compra</dt><dd>${U.esc(o.ordenCompra || '—')}</dd><dt>Producto</dt><dd>${U.esc(o.producto)} · ${o.cantidad} pzas</dd>
      <dt>Medida</dt><dd>${U.esc(o.medida)}</dd><dt>Material</dt><dd>${U.esc(o.material)}</dd>
      <dt>Numeración</dt><dd>${num}</dd><dt>Pegado</dt><dd>${U.esc(o.pegado)}</dd>
      <dt>Presentación</dt><dd>${U.esc(o.presentacion)}</dd><dt>Placa</dt><dd>${U.esc(o.placa)}</dd>
      <dt>Fecha de entrega</dt><dd>${U.date(o.fechaEntrega)}</dd><dt>Precio</dt><dd>${U.money(o.precio)}</dd>
      <dt>Notas</dt><dd>${U.esc(o.notas || '—')}</dd></dl>
    ${o.requierePrueba ? `<label class="check big"><input type="checkbox" data-change="toggleDiseno" data-id="${o.id}"${o.disenoAutorizado ? ' checked' : ''}> Diseño autorizado por el cliente</label>` : ''}
    <h3 class="sub">Lista de verificación del taller</h3><div class="checklist">${checks}</div>
    <h3 class="sub">Movimientos</h3><ul class="timeline">${hist || '<li class="muted">Sin movimientos.</li>'}</ul>
    <div class="modal-actions"><button class="btn btn-danger" data-action="borrarOrden" data-id="${o.id}">${icon('trash', 14)}Eliminar</button>
      <button class="btn" data-action="printOrden" data-id="${o.id}">${icon('printer', 15)}Imprimir orden</button>
      ${o.etapa !== 'entregado' && o.etapa !== 'entrega' ? `<button class="btn btn-primary" data-action="avanzar" data-id="${o.id}">Avanzar etapa ${icon('arrowRight', 14)}</button>` : ''}</div>`;
}
A.verOrden = ({ id }) => {
  const o = DB.get('ordenes', id);
  if (o) U.modal(`${o.folio} · ${o.clienteNombre}`, ordenDetalle(o), { wide: true });
};
C.check = async ({ id, key }, el) => {
  const o = DB.get('ordenes', id);
  await DB.update('ordenes', id, { checklist: { ...(o.checklist || {}), [key]: el.checked } });
};
C.toggleDiseno = async ({ id }, el) => { await DB.update('ordenes', id, { disenoAutorizado: el.checked }); U.toast(el.checked ? 'Diseño marcado como autorizado' : 'Diseño sin autorizar'); };
A.borrarOrden = async ({ id }) => {
  const o = DB.get('ordenes', id);
  if (!confirm('¿Eliminar la orden ' + o.folio + '? Esta acción no se puede deshacer.')) return;
  for (const e of D.entregas.filter(x => x.ordenId === id)) await DB.remove('entregas', e.id);
  if (o.cotizacionId) await DB.update('cotizaciones', o.cotizacionId, { ordenId: '' });
  await DB.remove('ordenes', id);
  U.closeModal(); U.toast('Orden eliminada');
};
A.printOrden = ({ id }) => {
  const o = DB.get('ordenes', id), c = o.checklist || {};
  const num = o.numDel !== '' && o.numDel != null ? `${o.numDel} al ${o.numAl}` : 'Sin numeración';
  U.print(`<div class="doc"><div class="doc-head"><div><h1>Orden de trabajo</h1><p>Imprenta Regional</p></div><div class="doc-folio"><strong>${o.folio}</strong><span>Entrega: ${U.date(o.fechaEntrega)}</span>${o.urgente ? '<span><b>URGENTE</b></span>' : ''}</div></div>
    <table class="doc-table"><tbody>
    <tr><th>Cliente</th><td>${U.esc(o.clienteNombre)}</td><th>Orden de compra</th><td>${U.esc(o.ordenCompra || '—')}</td></tr>
    <tr><th>Producto</th><td>${U.esc(o.producto)}</td><th>Cantidad</th><td>${o.cantidad}</td></tr>
    <tr><th>Medida</th><td>${U.esc(o.medida)}</td><th>Material</th><td>${U.esc(o.material)}</td></tr>
    <tr><th>Numeración</th><td>${num}</td><th>Pegado</th><td>${U.esc(o.pegado)}</td></tr>
    <tr><th>Presentación</th><td>${U.esc(o.presentacion)}</td><th>Placa</th><td>${U.esc(o.placa)}</td></tr>
    <tr><th>Notas</th><td colspan="3">${U.esc(o.notas || '—')}</td></tr></tbody></table>
    <h3>Lista de verificación del taller</h3>
    <ul class="doc-checks">${CHECKLIST.map(([k, l]) => `<li>${c[k] ? '☑' : '☐'} ${l}</li>`).join('')}</ul>
    <div class="doc-sign"><span>Oficina</span><span>Taller</span><span>Encuadernación</span></div></div>`);
};

/* ======================= SEGUIMIENTO (KANBAN) ======================= */
V.seguimiento = () => {
  const hoy = U.today();
  const activas = D.ordenes.filter(o => o.etapa !== 'entregado');
  const stats = `<div class="tracking-stats"><span><i class="legend-dot blue-dot"></i>${activas.length} órdenes activas</span>
    <span><i class="legend-dot orange-dot"></i>${activas.filter(o => o.urgente).length} urgentes</span>
    <span><i class="legend-dot red-dot"></i>${activas.filter(o => o.fechaEntrega < hoy).length} atrasadas</span></div>`;
  const cols = ETAPAS.map(et => {
    const items = activas.filter(o => o.etapa === et.id).sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
    return `<div class="kanban-col" data-etapa="${et.id}"><div class="kanban-title"><strong>${et.label}</strong><span>${items.length}</span></div>
      ${items.map(kCard).join('') || '<div class="kanban-empty">Sin órdenes</div>'}</div>`;
  }).join('');
  const nueva = App.user.rol === 'oficina' ? `<a class="btn" href="#/ordenes/nueva">${icon('plus', 16)}Nueva orden</a>` : '';
  return `<div class="page-content">${pageTitle('Seguimiento de producción', 'Arrastra las tarjetas entre columnas o usa «Avanzar».', nueva)}${stats}<div class="kanban">${cols}</div></div>`;
};

function kCard(o) {
  const atras = o.fechaEntrega < U.today();
  const chk = checklistProgreso(o);
  const tag = o.urgente ? U.badge('Urgente', 'orange') : atras ? U.badge('Atrasada', 'red') : U.badge('Normal', 'blue');
  const sinDiseno = o.requierePrueba && !o.disenoAutorizado;
  return `<div class="kanban-card ${o.urgente ? 'urgent' : ''}" draggable="true" data-id="${o.id}" data-action="verOrden">
    <div class="kanban-card-top"><strong>${o.folio}</strong>${tag}</div>
    <h3>${U.esc(o.producto)} · ${o.cantidad}</h3><p>${U.esc(o.clienteNombre)}</p>
    <div class="kanban-date">${icon('calendar', 14)}${U.date(o.fechaEntrega)}</div>
    ${o.etapa === 'taller' ? `<div class="chk-mini ${chk.done === chk.total ? 'ok' : ''}">Verificación ${chk.done}/${chk.total}</div>` : ''}
    ${sinDiseno ? '<div class="chk-mini warn">Diseño sin autorizar</div>' : ''}
    ${o.etapa !== 'entrega' ? `<button class="btn btn-sm btn-primary card-btn" data-action="avanzar" data-id="${o.id}">Avanzar ${icon('arrowRight', 13)}</button>` : '<div class="chk-mini ok">Lista para repartir (ver Entregas)</div>'}</div>`;
}

A.avanzar = async ({ id }) => {
  const o = DB.get('ordenes', id);
  const i = ETAPAS.findIndex(e => e.id === o.etapa);
  if (i < 0 || i >= ETAPAS.length - 1) return;
  await moverOrden(id, ETAPAS[i + 1].id);
};

/* Reglas de negocio al mover una orden entre etapas */
async function moverOrden(id, destino) {
  const o = DB.get('ordenes', id);
  if (!o || o.etapa === destino || !ETAPAS.some(e => e.id === destino)) return;
  const iO = ETAPAS.findIndex(e => e.id === o.etapa), iD = ETAPAS.findIndex(e => e.id === destino);

  if (iO === 0 && iD > 0 && o.requierePrueba && !o.disenoAutorizado) {
    U.toast('El diseño aún no está autorizado por el cliente.', 'error'); return;
  }
  if (iO < 2 && iD >= 2 && !checklistCompleta(o)) {
    U.toast('Completa la lista de verificación del taller antes de avanzar.', 'error'); A.verOrden({ id }); return;
  }

  const patch = { etapa: destino, historial: [...(o.historial || []), { etapa: destino, fecha: new Date().toISOString(), usuario: App.user.nombre }] };

  // Al salir de Oficina se descuenta el material del inventario
  if (iD >= 1 && !o.consumoDescontado && o.consumo > 0) {
    const m = D.materiales.find(x => x.nombre === o.material);
    if (m) {
      const nueva = Math.max(0, Number(m.existencia) - o.consumo);
      await DB.update('materiales', m.id, { existencia: nueva, actualizado: new Date().toISOString() });
      if (nueva <= Number(m.minimo)) setTimeout(() => U.toast(`Stock bajo de ${m.nombre}: quedan ${nueva} ${m.unidad}`, 'error'), 400);
    }
    patch.consumoDescontado = true;
  }
  await DB.update('ordenes', id, patch);

  // Al llegar a Entrega se programa la entrega con el horario del almacén del cliente
  if (destino === 'entrega' && !D.entregas.some(e => e.ordenId === id)) {
    const cli = clienteById(o.clienteId) || {};
    await DB.add('entregas', { ordenId: id, folio: o.folio, clienteId: o.clienteId, clienteNombre: o.clienteNombre, almacen: cli.direccion || '', horario: cli.horarioEntrega || '', fecha: o.fechaEntrega, repartidor: '', estado: 'Pendiente' });
  }
  // Si se regresa desde Entrega, se cancela la entrega pendiente
  if (o.etapa === 'entrega' && destino !== 'entrega') {
    for (const e of D.entregas.filter(x => x.ordenId === id && x.estado === 'Pendiente')) await DB.remove('entregas', e.id);
  }
  U.toast(`${o.folio} → ${etapaInfo(destino).label}`);
  if (document.querySelector('.modal-back')) U.closeModal();
}

/* Arrastrar y soltar */
document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('.kanban-card');
  if (!c) return;
  e.dataTransfer.setData('text/plain', c.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
  c.classList.add('dragging');
});
document.addEventListener('dragend', e => {
  document.querySelectorAll('.dragging,.drag-over').forEach(x => x.classList.remove('dragging', 'drag-over'));
});
document.addEventListener('dragover', e => {
  const col = e.target.closest && e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(x => x !== col && x.classList.remove('drag-over'));
  col.classList.add('drag-over');
});
document.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  moverOrden(e.dataTransfer.getData('text/plain'), col.dataset.etapa);
});
