/* Orquestador: login, rutas por hash, menú por rol y delegación de eventos */
const ACCESO = {
  oficina: ['dashboard', 'clientes', 'cotizaciones', 'ordenes', 'seguimiento', 'inventario', 'entregas', 'facturas'],
  taller: ['seguimiento', 'ordenes', 'inventario'],
  encuadernacion: ['seguimiento', 'ordenes'],
  reparto: ['entregas']
};
const ROL_LABEL = { oficina: 'Oficina · Administrador', taller: 'Taller', encuadernacion: 'Encuadernación', reparto: 'Reparto' };
const NAV = [
  {
    label: 'Principal',
    items: [
      ['dashboard', 'Dashboard', 'dashboard']
    ]
  },
  {
    label: 'Oficina y Ventas',
    items: [
      ['clientes', 'Clientes', 'users'],
      ['cotizaciones', 'Cotizaciones', 'filePlus']
    ]
  },
  {
    label: 'Taller y Producción',
    items: [
      ['seguimiento', 'Tablero de seguimiento', 'kanban'],
      ['ordenes', 'Órdenes de trabajo', 'clipboard'],
      ['inventario', 'Inventario', 'box']
    ]
  },
  {
    label: 'Distribución y Cobro',
    items: [
      ['entregas', 'Entregas', 'truck'],
      ['facturas', 'Facturación', 'creditCard']
    ]
  }
];

const App = (() => {
  let shellFor = null, formRoute = false, loginError = '', lastHash = null;
  const self = { user: null };

  const route = () => {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
  };

  function alertas() {
    const permitido = s => ACCESO[self.user.rol].includes(s);
    const l = [], hoy = U.today();
    if (permitido('inventario')) D.materiales.filter(m => Number(m.existencia) <= Number(m.minimo)).forEach(m => l.push([`Stock bajo: ${m.nombre} (${m.existencia} ${m.unidad})`, '#/inventario']));
    if (permitido('facturas')) D.facturas.filter(f => estadoFactura(f) === 'Vencida').forEach(f => l.push([`Factura vencida: ${f.numero} de ${f.clienteNombre} (${U.money(f.monto)})`, '#/facturas']));
    if (permitido('seguimiento')) D.ordenes.filter(o => o.etapa !== 'entregado' && o.fechaEntrega < hoy).forEach(o => l.push([`Orden atrasada: ${o.folio} de ${o.clienteNombre}`, '#/seguimiento']));
    return l;
  }

  function loginView(app) {
    app.innerHTML = `<div class="login-wrap"><form class="login-card" data-form="login">
      <div class="brand login-brand"><div class="brand-mark">IR</div><div class="brand-info"><span class="brand-title">Imprenta Regional</span><span class="brand-sub">Sistema de Gestión</span></div></div>
      <h1>Iniciar sesión</h1><p class="muted">Accede al panel de gestión de la imprenta.</p>
      <div id="login-error" class="form-error" role="alert" ${loginError ? '' : 'hidden'}>${U.esc(loginError)}</div>
      <label>Correo electrónico<input type="email" name="email" required autocomplete="username"></label>
      <label>Contraseña<input type="password" name="pass" required autocomplete="current-password"></label>
      <button class="btn btn-primary full-btn">Ingresar</button>
      ${DB.isDemo() ? `<div class="demo-box"><strong>Modo demo</strong> (datos guardados en este navegador). Contraseña: <code>123456</code>
        <div class="demo-users">${DEMO_USERS.map(u => `<button type="button" class="btn btn-sm" data-action="demoUser" data-email="${u.email}">${ROL_LABEL[u.rol].split(' ·')[0]}</button>`).join('')}</div></div>` : ''}
    </form></div>`;
  }

  function shell() {
    const nav = NAV.map(g => {
      const items = g.items.filter(([id]) => ACCESO[self.user.rol].includes(id));
      if (!items.length) return '';
      return `<div class="nav-group"><div class="nav-label">${g.label}</div>${items.map(([id, l, ic]) =>
        `<a class="nav-item" data-nav="${id}" href="#/${id}">${icon(ic, 19)}<span>${l}</span>${id === 'seguimiento' ? '<span class="nav-badge" id="cnt-seg"></span>' : ''}${id === 'facturas' ? '<span class="nav-badge" id="cnt-fac"></span>' : ''}</a>`).join('')}</div>`;
    }).join('');
    return `<div class="app-shell"><div id="scrim" class="mobile-scrim" data-action="menu" hidden></div>
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <div class="brand-mark">IR</div>
          <div class="brand-info">
            <span class="brand-title">Imprenta Regional</span>
            <span class="brand-sub">Sistema de Gestión</span>
          </div>
          <button class="close-mobile" data-action="menu" aria-label="Cerrar menú">${icon('x', 18)}</button>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-bottom">
          <div class="user-card"><div class="avatar">${U.initials(self.user.nombre)}</div><div><strong>${U.esc(self.user.nombre)}</strong><small>${ROL_LABEL[self.user.rol] || self.user.rol}</small></div></div>
          ${DB.isDemo() && self.user.rol === 'oficina' ? `<button class="nav-item" data-action="resetDemo">${icon('trash', 16)}<span>Restablecer demo</span></button>` : ''}
          <button class="nav-item logout" data-action="logout">${icon('logout', 16)}<span>Cerrar sesión</span></button></div>
      </aside>
      <div class="main-area"><header class="topbar" id="topbar"></header><main id="main"></main></div></div>`;
  }

  function render() {
    const app = document.getElementById('app');
    if (!self.user) { shellFor = null; document.body.classList.remove('rol-taller'); loginView(app); return; }
    if (shellFor !== self.user.uid) { app.innerHTML = shell(); shellFor = self.user.uid; }
    document.body.classList.toggle('rol-taller', self.user.rol === 'taller' || self.user.rol === 'encuadernacion');

    const { parts, q } = route(), section = parts[0];
    if (!section || !ACCESO[self.user.rol].includes(section)) { location.replace('#/' + ACCESO[self.user.rol][0]); return; }

    const main = document.getElementById('main');
    let res;
    try { res = V[section](parts.slice(1), q); } catch (err) { console.error(err); res = `<div class="page-content"><p>Ocurrió un error al mostrar esta pantalla: ${U.esc(err.message)}</p></div>`; }
    const obj = typeof res === 'string' ? { html: res } : res;
    formRoute = !!obj.form;
    main.innerHTML = obj.html;
    if (obj.mount) obj.mount(main);
    if (lastHash !== location.hash) { window.scrollTo(0, 0); lastHash = location.hash; }

    const titulo = NAV.flatMap(g => g.items).find(i => i[0] === section)[1];
    const sub = parts[1] === 'nueva' ? 'Nueva' : '';
    const nAl = alertas().length;
    document.getElementById('topbar').innerHTML = `<button class="mobile-menu" data-action="menu" aria-label="Abrir menú">${icon('menu', 21)}</button>
      <div class="breadcrumb"><span>Imprenta Regional</span><span>/</span><strong>${titulo}${sub ? ' / ' + sub : ''}</strong></div>
      <div class="top-actions"><button class="icon-button" data-action="alertas" aria-label="Alertas (${nAl})">${icon('bell', 18)}${nAl ? '<span class="notification-dot"></span>' : ''}</button>
        <div class="top-user"><div class="avatar avatar-small">${U.initials(self.user.nombre)}</div><div><strong>${U.esc(self.user.nombre)}</strong><small>${ROL_LABEL[self.user.rol] || ''}</small></div></div></div>`;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === section));
    const segCnt = document.getElementById('cnt-seg');
    if (segCnt) {
      const n = D.ordenes.filter(o => o.etapa !== 'entregado' && (o.urgente || o.etapa === 'taller')).length || D.ordenes.filter(o => o.etapa !== 'entregado').length;
      segCnt.textContent = n;
      segCnt.hidden = !n;
    }
    const cnt = document.getElementById('cnt-fac');
    if (cnt) { const n = D.facturas.filter(f => estadoFactura(f) === 'Vencida').length; cnt.textContent = n; cnt.hidden = !n; }
    document.getElementById('sidebar').classList.remove('sidebar-open');
    document.getElementById('scrim').hidden = true;
  }

  self.render = render;
  self.refresh = () => {
    if (!self.user || document.querySelector('.modal-back') || formRoute) return;
    render();
  };

  self.start = () => {
    document.getElementById('app').innerHTML = '<div class="loading">Cargando…</div>';
    DB.onAuth((u, msg) => {
      if (msg) loginError = msg;
      self.user = u;
      if (u) loginError = '';
      render();
    });
    DB.subscribe(self.refresh);
    DB.init().catch(err => { document.getElementById('app').innerHTML = `<div class="loading">No se pudo iniciar: ${U.esc(err.message)}</div>`; });
  };
  return self;
})();

/* ---------- Acciones generales ---------- */
A.goto = ({ href }) => { location.hash = href; };
A.menu = () => {
  const sb = document.getElementById('sidebar'), open = sb.classList.toggle('sidebar-open');
  document.getElementById('scrim').hidden = !open;
};
A.logout = () => DB.logout();
A.demoUser = ({ email }) => {
  const f = document.querySelector('.login-card');
  f.elements.email.value = email; f.elements.pass.value = '123456';
};
A.resetDemo = () => {
  if (confirm('¿Restablecer todos los datos de demostración?')) { DB.resetDemo(); U.toast('Datos demo restablecidos'); }
};
A.alertas = () => {
  const items = alertas();
  U.modal('Alertas', items.length
    ? `<ul class="alert-list">${items.map(([t, h]) => `<li><a href="${h}" data-close>${icon('alert', 15)} ${U.esc(t)}</a></li>`).join('')}</ul>`
    : '<p class="muted">No hay alertas por ahora.</p>');
};

F.login = async (form) => {
  const f = Object.fromEntries(new FormData(form));
  const errBox = form.querySelector('#login-error');
  try {
    if (errBox) errBox.hidden = true;
    await DB.login(f.email, f.pass);
  } catch (err) {
    const codigos = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
    const msg = codigos.includes(err.code) ? 'Correo o contraseña incorrectos' : (err.message || 'No se pudo iniciar sesión');
    if (errBox) {
      errBox.textContent = msg;
      errBox.hidden = false;
    }
  }
};

/* ---------- Delegación de eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (t && A[t.dataset.action]) A[t.dataset.action](t.dataset, t, e);
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-change]');
  if (t && C[t.dataset.change]) C[t.dataset.change](t.dataset, t, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  if (F[f.dataset.form]) F[f.dataset.form](f, e);
});
document.addEventListener('input', e => {
  const t = e.target.closest('[data-filter]');
  if (!t) return;
  const q = t.value.toLowerCase();
  document.querySelectorAll(t.dataset.filter + ' tbody tr').forEach(tr => { tr.hidden = !tr.textContent.toLowerCase().includes(q); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') U.closeModal(); });
window.addEventListener('hashchange', () => { U.closeModal(true); App.render(); });

App.start();
