/* Vistas: Inventario, Entregas y Facturas/cobranza */

/* ======================= INVENTARIO ======================= */
V.inventario = () => {
  const rows = D.materiales.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(m => {
    const bajo = Number(m.existencia) <= Number(m.minimo);
    return `<tr>
      <td data-label="Material"><strong>${U.esc(m.nombre)}</strong></td>
      <td data-label="Existencia">${m.existencia} ${U.esc(m.unidad)}</td>
      <td data-label="Mínimo" class="muted">${m.minimo} ${U.esc(m.unidad)}</td>
      <td data-label="Estado">${U.badge(bajo ? 'Stock bajo' : 'En stock', bajo ? 'red' : 'green')}</td>
      <td data-label="Actualizado" class="muted">${U.dateTime(m.actualizado)}</td>
    </tr>`;
  }).join('');
  const puedeEditar = App.user.rol === 'oficina' || App.user.rol === 'taller';
  const acciones = puedeEditar ? `<div class="button-row">
      <button class="btn" data-action="nuevoMaterial">${icon('plus', 16)}Nuevo material</button>
      <button class="btn" data-action="movMaterial" data-tipo="entrada">${icon('plus', 16)}Registrar entrada</button>
      <button class="btn btn-primary" data-action="movMaterial" data-tipo="consumo">${icon('check', 16)}Registrar consumo</button></div>` : '';
  return `<div class="page-content">${pageTitle('Inventario de materiales', 'Controla existencias y niveles mínimos de materiales.', acciones)}
    <section class="panel table-panel"><div class="toolbar">${searchBar('Buscar material...', '#t-inv')}</div>
    <div class="table-wrap"><table id="t-inv"><thead><tr><th>Material</th><th>Existencia</th><th>Mínimo</th><th>Estado</th><th>Última actualización</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="empty-row">Sin materiales.</td></tr>'}</tbody></table></div></section></div>`;
};

A.nuevoMaterial = () => U.modal('Nuevo material', `<form data-form="material" class="form-grid modal-form">
  <label class="full">Nombre<input name="nombre" required placeholder="Ej. Papel bond 90g"></label>
  <label>Existencia inicial<input type="number" min="0" step="0.01" name="existencia" value="0"></label>
  <label>Unidad<input name="unidad" required placeholder="resmas, m², hojas..."></label>
  <label>Stock mínimo<input type="number" min="0" step="0.01" name="minimo" value="0"></label>
  <div class="full modal-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-primary">Guardar</button></div></form>`);
F.material = async form => {
  const f = Object.fromEntries(new FormData(form));
  await DB.add('materiales', { nombre: f.nombre.trim(), existencia: Number(f.existencia) || 0, minimo: Number(f.minimo) || 0, unidad: f.unidad.trim(), actualizado: new Date().toISOString() });
  U.toast('Material agregado'); U.closeModal();
};
A.movMaterial = ({ tipo }) => {
  const entrada = tipo === 'entrada';
  U.modal(entrada ? 'Registrar entrada de material' : 'Registrar consumo de material', `<form data-form="movMaterial" class="form-grid modal-form">
    <input type="hidden" name="tipo" value="${tipo}">
    <label class="full">Material<select name="materialId" required>${U.options(D.materiales.map(m => [m.id, `${m.nombre} (${m.existencia} ${m.unidad})`]))}</select></label>
    <label class="full">Cantidad<input type="number" min="0.01" step="0.01" name="cantidad" required></label>
    <div class="full modal-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-primary">${entrada ? 'Registrar entrada' : 'Registrar consumo'}</button></div></form>`);
};
F.movMaterial = async form => {
  const f = Object.fromEntries(new FormData(form));
  const m = DB.get('materiales', f.materialId), cant = Number(f.cantidad);
  if (!m || !(cant > 0)) return;
  if (f.tipo === 'consumo' && cant > Number(m.existencia)) { U.toast('No hay suficiente existencia', 'error'); return; }
  const nueva = f.tipo === 'entrada' ? Number(m.existencia) + cant : Number(m.existencia) - cant;
  await DB.update('materiales', m.id, { existencia: Math.round(nueva * 100) / 100, actualizado: new Date().toISOString() });
  U.toast('Inventario actualizado'); U.closeModal();
};

/* ======================= ENTREGAS ======================= */
let entFiltro = 'Pendiente';
A.entFiltro = ({ v }) => { entFiltro = v; App.refresh(); };

V.entregas = () => {
  const hoy = U.today();
  const lista = D.entregas.filter(e => e.estado === entFiltro).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.almacen.localeCompare(b.almacen));
  const reps = [...new Set(D.usuarios.filter(u => u.rol === 'reparto').map(u => u.nombre))];
  const grupos = {};
  lista.forEach(e => { (grupos[e.fecha] = grupos[e.fecha] || []).push(e); });
  const html = Object.keys(grupos).map(fecha => {
    const rel = fecha === hoy ? ' · Hoy' : fecha < hoy && entFiltro === 'Pendiente' ? ' · Atrasada' : fecha === U.addDays(hoy, 1) ? ' · Mañana' : '';
    return `<h3 class="day-title ${fecha < hoy && entFiltro === 'Pendiente' ? 'late' : ''}">${U.date(fecha)}${rel}</h3>
      <div class="delivery-grid">${grupos[fecha].map(e => `
      <div class="panel delivery-card"><div class="kanban-card-top"><strong class="order-id">${e.folio}</strong>${U.badge(e.estado, e.estado === 'Entregado' ? 'green' : 'orange')}</div>
        <h3>${U.esc(e.clienteNombre)}</h3>
        <p class="muted">${icon('truck', 13)} ${U.esc(e.almacen || 'Sin dirección registrada')}</p>
        <p class="muted">${icon('clock', 13)} Horario: ${U.esc(e.horario || '—')}</p>
        <label class="rep-label">Repartidor<input class="inline-input" list="lista-reps" value="${U.esc(e.repartidor)}" placeholder="Asignar..." data-change="asignarRep" data-id="${e.id}"></label>
        ${e.estado === 'Pendiente' ? `<button class="btn btn-primary full-btn" data-action="marcarEntregado" data-id="${e.id}">${icon('check', 15)}Marcar entregado</button>` : `<p class="muted">Entregado el ${U.date(e.fechaEntregado)}</p>`}
      </div>`).join('')}</div>`;
  }).join('');
  const tab = (v, l) => `<button class="tab ${entFiltro === v ? 'active' : ''}" data-action="entFiltro" data-v="${v}">${l}</button>`;
  return `<div class="page-content">${pageTitle('Entregas', 'Organiza las entregas por día, almacén y repartidor.')}
    <div class="tabs">${tab('Pendiente', 'Pendientes')}${tab('Entregado', 'Entregadas')}</div>
    <datalist id="lista-reps">${reps.map(r => `<option value="${U.esc(r)}">`).join('')}</datalist>
    ${html || `<section class="panel empty-panel"><div class="empty-icon">${icon('truck', 24)}</div><h2>Sin entregas ${entFiltro === 'Pendiente' ? 'pendientes' : 'registradas'}</h2><p class="muted">Las entregas aparecen aquí cuando una orden llega a la etapa «Entrega».</p></section>`}</div>`;
};
C.asignarRep = async ({ id }, el) => { await DB.update('entregas', id, { repartidor: el.value.trim() }); U.toast('Repartidor asignado'); };

/* Al entregar: se cierra la orden y se genera la factura con el plazo de pago del cliente */
A.marcarEntregado = async ({ id }) => {
  const e = DB.get('entregas', id);
  if (!e) return;
  const hoy = U.today();
  await DB.update('entregas', id, { estado: 'Entregado', fechaEntregado: hoy });
  const o = DB.get('ordenes', e.ordenId);
  if (o) {
    await DB.update('ordenes', o.id, { etapa: 'entregado', fechaEntregado: hoy, historial: [...(o.historial || []), { etapa: 'entregado', fecha: new Date().toISOString(), usuario: App.user.nombre }] });
    if (!D.facturas.some(f => f.ordenId === o.id)) {
      const cli = clienteById(o.clienteId) || {};
      await DB.add('facturas', { numero: DB.nextFolio('facturas', 'FAC-', 'numero'), ordenId: o.id, clienteId: o.clienteId, clienteNombre: o.clienteNombre, monto: o.precio, fechaEmision: hoy, vencimiento: U.addDays(hoy, Number(cli.plazoPago) || 0), estado: 'Pendiente' });
      U.toast(`Entrega registrada y factura generada (vence en ${cli.plazoPago || 0} días)`);
      return;
    }
  }
  U.toast('Entrega registrada');
};

/* ======================= FACTURAS Y COBRANZA ======================= */
let facFiltro = 'Todas';
A.facFiltro = ({ v }) => { facFiltro = v; App.refresh(); };

V.facturas = () => {
  const est = D.facturas.map(f => ({ f, e: estadoFactura(f) }));
  const pend = est.filter(x => x.e !== 'Pagada');
  const venc = est.filter(x => x.e === 'Vencida');
  const total = pend.reduce((s, x) => s + Number(x.f.monto), 0);
  const tono = { Pagada: 'green', Pendiente: 'orange', Vencida: 'red' };
  const rows = est.filter(x => facFiltro === 'Todas' || x.e === facFiltro).sort((a, b) => b.f.vencimiento.localeCompare(a.f.vencimiento)).map(({ f, e }) => `
    <tr><td data-label="Cliente"><strong>${U.esc(f.clienteNombre)}</strong></td>
      <td class="order-id" data-label="Factura">${f.numero}</td>
      <td data-label="Monto"><strong>${U.money(f.monto)}</strong></td>
      <td data-label="Emisión">${U.date(f.fechaEmision)}</td>
      <td data-label="Vencimiento">${U.date(f.vencimiento)}</td>
      <td data-label="Estado">${U.badge(e, tono[e])}</td>
      <td class="row-actions">${e !== 'Pagada' ? `<button class="btn btn-sm" data-action="pagarFactura" data-id="${f.id}">${icon('check', 14)}Marcar pagada</button>` : ''}</td></tr>`).join('');
  const tab = v => `<button class="tab ${facFiltro === v ? 'active' : ''}" data-action="facFiltro" data-v="${v}">${v}</button>`;
  return `<div class="page-content">${pageTitle('Facturas y cobranza', 'Consulta el estado de tus facturas y pagos pendientes.',
    `<button class="btn btn-primary" data-action="nuevaFactura">${icon('plus', 16)}Nueva factura</button>`)}
    <div class="mini-filters"><div class="summary-filter"><strong>${U.money(total)}</strong><span>Total por cobrar</span></div>
      <div class="summary-filter"><strong>${pend.length}</strong><span>Facturas pendientes</span></div>
      <div class="summary-filter danger"><strong>${venc.length}</strong><span>Facturas vencidas</span></div></div>
    <div class="tabs">${['Todas', 'Pendiente', 'Vencida', 'Pagada'].map(tab).join('')}</div>
    <section class="panel table-panel"><div class="toolbar">${searchBar('Buscar cliente o número...', '#t-fac')}</div>
    <div class="table-wrap"><table id="t-fac"><thead><tr><th>Cliente</th><th>Factura</th><th>Monto</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="empty-row">Sin facturas en esta vista.</td></tr>'}</tbody></table></div></section></div>`;
};
A.pagarFactura = async ({ id }) => { await DB.update('facturas', id, { estado: 'Pagada', fechaPago: U.today() }); U.toast('Factura marcada como pagada'); };
A.nuevaFactura = () => U.modal('Nueva factura', `<form data-form="factura" class="form-grid modal-form">
  <label class="full">Cliente<select name="clienteId" required>${U.options([['', 'Selecciona un cliente'], ...D.clientes.map(c => [c.id, c.nombre])])}</select></label>
  <label>Monto (MXN)<input type="number" min="0" step="0.01" name="monto" required></label>
  <label>Fecha de emisión<input type="date" name="fechaEmision" value="${U.today()}" required></label>
  <p class="full muted">El vencimiento se calcula con el plazo de pago del cliente.</p>
  <div class="full modal-actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-primary">Guardar factura</button></div></form>`);
F.factura = async form => {
  const f = Object.fromEntries(new FormData(form));
  const cli = clienteById(f.clienteId);
  if (!cli) { U.toast('Selecciona un cliente', 'error'); return; }
  await DB.add('facturas', { numero: DB.nextFolio('facturas', 'FAC-', 'numero'), ordenId: '', clienteId: cli.id, clienteNombre: cli.nombre, monto: Number(f.monto), fechaEmision: f.fechaEmision, vencimiento: U.addDays(f.fechaEmision, Number(cli.plazoPago) || 0), estado: 'Pendiente' });
  U.toast('Factura creada'); U.closeModal();
};
