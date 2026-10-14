/*
  Capa de datos. Las vistas SOLO usan DB.data / DB.add / DB.update / DB.remove,
  así que el resto de la app no sabe si abajo hay localStorage o Firebase.
*/
const DB = (() => {
  const COLS = ['clientes', 'cotizaciones', 'ordenes', 'materiales', 'entregas', 'facturas', 'usuarios'];
  const KEY = 'imprenta_regional_v1', SES = 'imprenta_regional_sesion';
  const data = {};
  COLS.forEach(c => { data[c] = []; });
  const listeners = [];
  let authCb = () => {};
  let fb = null;
  let unsubs = [];

  const usingFirebase = () =>
    typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !/^TU_/.test(FIREBASE_CONFIG.apiKey);
  const emit = () => listeners.forEach(f => f());
  const clean = o => JSON.parse(JSON.stringify(o)); // Firestore no acepta "undefined"

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => rej(new Error('No se pudo cargar ' + src + '. ¿Hay internet?'));
      document.head.appendChild(s);
    });
  }

  /* ---------- Modo local (demo) ---------- */
  function saveLocal() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function loadLocal() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o) { COLS.forEach(c => { data[c] = o[c] || []; }); return; }
    } catch (e) { /* datos corruptos: se regeneran */ }
    const s = buildSeed();
    COLS.forEach(c => { data[c] = s[c] || []; });
    saveLocal();
  }

  /* ---------- Firebase ---------- */
  function watchAll() {
    unwatch();
    COLS.forEach(c => {
      unsubs.push(fb.fs.collection(c).onSnapshot(snap => {
        data[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        emit();
      }, err => console.error('Error leyendo ' + c, err)));
    });
  }
  function unwatch() { unsubs.forEach(u => u()); unsubs = []; COLS.forEach(c => { data[c] = []; }); }

  async function init() {
    if (usingFirebase()) {
      const v = '10.12.2';
      for (const lib of ['app', 'auth', 'firestore']) {
        await loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-${lib}-compat.js`);
      }
      firebase.initializeApp(FIREBASE_CONFIG);
      fb = { auth: firebase.auth(), fs: firebase.firestore() };
      fb.auth.onAuthStateChanged(async u => {
        if (!u) { unwatch(); authCb(null); return; }
        try {
          const doc = await fb.fs.collection('usuarios').doc(u.uid).get();
          if (!doc.exists) {
            authCb(null, 'Tu usuario no tiene rol asignado. Pide al administrador que cree su documento en la colección "usuarios".');
            await fb.auth.signOut();
            return;
          }
          const p = doc.data();
          watchAll();
          authCb({ uid: u.uid, email: u.email, nombre: p.nombre || u.email, rol: p.rol });
        } catch (e) { authCb(null, 'No se pudo leer tu perfil: ' + e.message); }
      });
    } else {
      loadLocal();
      authCb(JSON.parse(localStorage.getItem(SES) || 'null'));
    }
  }

  async function login(email, pass) {
    if (fb) return fb.auth.signInWithEmailAndPassword(email, pass);
    const u = DEMO_USERS.find(x => x.email === email.trim().toLowerCase() && x.pass === pass);
    if (!u) throw new Error('Correo o contraseña incorrectos');
    const ses = { uid: u.uid, email: u.email, nombre: u.nombre, rol: u.rol };
    localStorage.setItem(SES, JSON.stringify(ses));
    authCb(ses);
  }
  async function logout() {
    if (fb) { await fb.auth.signOut(); return; }
    localStorage.removeItem(SES);
    authCb(null);
  }

  /* ---------- CRUD ---------- */
  async function add(col, obj) {
    obj = clean(obj);
    if (fb) { const ref = await fb.fs.collection(col).add(obj); return ref.id; }
    const id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    data[col].push({ ...obj, id });
    saveLocal(); emit();
    return id;
  }
  async function update(col, id, patch) {
    patch = clean(patch);
    if (fb) { await fb.fs.collection(col).doc(id).update(patch); return; }
    const i = data[col].findIndex(x => x.id === id);
    if (i < 0) return;
    data[col][i] = { ...data[col][i], ...patch };
    saveLocal(); emit();
  }
  async function remove(col, id) {
    if (fb) { await fb.fs.collection(col).doc(id).delete(); return; }
    data[col] = data[col].filter(x => x.id !== id);
    saveLocal(); emit();
  }

  /* Siguiente folio: COT-0007, OT-0012, FAC-0003... */
  function nextFolio(col, prefix, field = 'folio') {
    const max = data[col].reduce((m, x) => Math.max(m, parseInt(String(x[field] || '').replace(/\D/g, ''), 10) || 0), 0);
    return prefix + String(max + 1).padStart(4, '0');
  }

  function resetDemo() {
    if (fb) return;
    localStorage.removeItem(KEY);
    loadLocal();
    emit();
  }

  return {
    data, init, login, logout, add, update, remove, nextFolio, resetDemo,
    get: (col, id) => data[col].find(x => x.id === id),
    subscribe: f => listeners.push(f),
    onAuth: f => { authCb = f; },
    isDemo: () => !usingFirebase()
  };
})();
