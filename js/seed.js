/* Usuarios de prueba (solo modo demo). En Firebase los usuarios viven en Authentication + colección "usuarios". */
const DEMO_USERS = [
  { uid: 'u1', email: 'oficina@imprenta.com', pass: '123456', nombre: 'Ana García', rol: 'oficina' },
  { uid: 'u2', email: 'taller@imprenta.com', pass: '123456', nombre: 'Luis Torres', rol: 'taller' },
  { uid: 'u3', email: 'encuadernacion@imprenta.com', pass: '123456', nombre: 'María Ruiz', rol: 'encuadernacion' },
  { uid: 'u4', email: 'reparto@imprenta.com', pass: '123456', nombre: 'Jorge Ramírez', rol: 'reparto' }
];

/* Datos de ejemplo con fechas relativas a hoy, para que el sistema se vea "vivo" al probarlo */
function buildSeed() {
  const t = U.today(), d = n => U.addDays(t, n);
  const chkOk = { medida: true, numeracion: true, pegado: true, material: true, presentacion: true };
  const chkNo = { medida: false, numeracion: false, pegado: false, material: false, presentacion: false };

  const clientes = [
    { id: 'c1', nombre: 'Grupo Horizonte', contacto: 'Laura Mena', correo: 'contacto@horizonte.mx', telefono: '55 1234 5678', direccion: 'Almacén Central, Av. Industria 120', horarioEntrega: 'Lun–Vie 9:00–13:00', plazoPago: 30, estado: 'Activo' },
    { id: 'c2', nombre: 'Clínica San José', contacto: 'Dr. Pablo Ríos', correo: 'compras@csanjose.mx', telefono: '55 9876 1200', direccion: 'Sucursal Norte, Calle Hidalgo 45', horarioEntrega: 'Lun–Sáb 8:00–12:00', plazoPago: 15, estado: 'Activo' },
    { id: 'c3', nombre: 'Café Central', contacto: 'Sofía Luna', correo: 'admin@cafecentral.mx', telefono: '55 4231 8765', direccion: 'Bodega Centro, Reforma 300', horarioEntrega: 'Lun–Vie 10:00–14:00', plazoPago: 30, estado: 'Activo' },
    { id: 'c4', nombre: 'Constructora Delta', contacto: 'Ing. Mario Vela', correo: 'proyectos@delta.mx', telefono: '55 6677 8899', direccion: 'Oficinas Delta, Blvd. del Parque 800', horarioEntrega: 'Lun–Vie 9:00–17:00', plazoPago: 45, estado: 'Activo' }
  ];

  const materiales = [
    { id: 'm1', nombre: 'Papel bond 90g', existencia: 12, minimo: 10, unidad: 'resmas', actualizado: new Date().toISOString() },
    { id: 'm2', nombre: 'Cartulina couché', existencia: 4, minimo: 8, unidad: 'paquetes', actualizado: new Date().toISOString() },
    { id: 'm3', nombre: 'Vinil blanco', existencia: 24, minimo: 15, unidad: 'm²', actualizado: new Date().toISOString() },
    { id: 'm4', nombre: 'Lona front 13 oz', existencia: 8, minimo: 20, unidad: 'm²', actualizado: new Date().toISOString() },
    { id: 'm5', nombre: 'Acrílico transparente', existencia: 6, minimo: 4, unidad: 'hojas', actualizado: new Date().toISOString() }
  ];

  const cotizaciones = [
    { id: 'q1', folio: 'COT-0001', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', producto: 'Bloc', cantidad: 500, medida: '21 x 28 cm', material: 'Papel bond 90g', precio: 4250, estado: 'Autorizada', fecha: d(-60), ordenCompra: 'OC-1180', notas: '', ordenId: 'o1' },
    { id: 'q2', folio: 'COT-0002', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', producto: 'Bloc', cantidad: 1000, medida: '21 x 28 cm', material: 'Papel bond 90g', precio: 7800, estado: 'Autorizada', fecha: d(-20), ordenCompra: 'OC-1244', notas: '', ordenId: 'o2' },
    { id: 'q3', folio: 'COT-0003', clienteId: 'c2', clienteNombre: 'Clínica San José', producto: 'Lona', cantidad: 3, medida: '2 x 1 m', material: 'Lona front 13 oz', precio: 2400, estado: 'Autorizada', fecha: d(-45), ordenCompra: 'OC-77', notas: '', ordenId: 'o3' },
    { id: 'q4', folio: 'COT-0004', clienteId: 'c3', clienteNombre: 'Café Central', producto: 'Papel', cantidad: 200, medida: 'Carta', material: 'Cartulina couché', precio: 4000, estado: 'Autorizada', fecha: d(-30), ordenCompra: 'OC-31', notas: 'Menú impreso', ordenId: 'o6' },
    { id: 'q5', folio: 'COT-0005', clienteId: 'c4', clienteNombre: 'Constructora Delta', producto: 'Vinil', cantidad: 15, medida: 'Rollo 1.2 m', material: 'Vinil blanco', precio: 6300, estado: 'Autorizada', fecha: d(-10), ordenCompra: 'OC-5502', notas: '', ordenId: 'o7' },
    { id: 'q6', folio: 'COT-0006', clienteId: 'c3', clienteNombre: 'Café Central', producto: 'Acrílico', cantidad: 5, medida: '30 x 40 cm', material: 'Acrílico transparente', precio: 1750, estado: 'Enviada', fecha: d(-2), ordenCompra: '', notas: 'Portamenús', ordenId: '' }
  ];

  const base = { requierePrueba: false, disenoAutorizado: true, placa: 'Placa existente en archivo', pegado: 'Sin pegado', presentacion: 'Bloc', numDel: '', numAl: '', consumo: 0, consumoDescontado: true, urgente: false, notas: '', ordenCompra: '' };
  const ordenes = [
    { ...base, id: 'o1', folio: 'OT-0001', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', cotizacionId: 'q1', ordenCompra: 'OC-1180', producto: 'Bloc', cantidad: 500, medida: '21 x 28 cm', material: 'Papel bond 90g', numDel: 1, numAl: 500, pegado: 'Pegado por cabeza', precio: 4250, fechaCreacion: d(-58), fechaEntrega: d(-52), fechaEntregado: d(-52), etapa: 'entregado', checklist: chkOk, historial: [] },
    { ...base, id: 'o2', folio: 'OT-0002', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', cotizacionId: 'q2', ordenCompra: 'OC-1244', producto: 'Bloc', cantidad: 1000, medida: '21 x 28 cm', material: 'Papel bond 90g', numDel: 1, numAl: 1000, pegado: 'Pegado por cabeza', precio: 7800, fechaCreacion: d(-18), fechaEntrega: d(-12), fechaEntregado: d(-12), etapa: 'entregado', checklist: chkOk, historial: [] },
    { ...base, id: 'o3', folio: 'OT-0003', clienteId: 'c2', clienteNombre: 'Clínica San José', cotizacionId: 'q3', ordenCompra: 'OC-77', producto: 'Lona', cantidad: 3, medida: '2 x 1 m', material: 'Lona front 13 oz', presentacion: 'Rollo', precio: 2400, fechaCreacion: d(-43), fechaEntrega: d(-39), fechaEntregado: d(-39), etapa: 'entregado', checklist: chkOk, historial: [] },
    { ...base, id: 'o4', folio: 'OT-0004', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', cotizacionId: '', ordenCompra: 'OC-1301', producto: 'Bloc', cantidad: 800, medida: '14 x 21 cm', material: 'Papel bond 90g', numDel: 2001, numAl: 2800, pegado: 'Pegado por cabeza', precio: 6400, urgente: true, fechaCreacion: d(-3), fechaEntrega: d(1), etapa: 'taller', checklist: { ...chkNo, medida: true }, historial: [{ etapa: 'oficina', fecha: new Date(Date.now() - 3 * 864e5).toISOString(), usuario: 'Ana García' }, { etapa: 'taller', fecha: new Date(Date.now() - 864e5).toISOString(), usuario: 'Ana García' }] },
    { ...base, id: 'o5', folio: 'OT-0005', clienteId: 'c2', clienteNombre: 'Clínica San José', cotizacionId: '', ordenCompra: 'OC-91', producto: 'Lona', cantidad: 2, medida: '3 x 1 m', material: 'Lona front 13 oz', presentacion: 'Rollo', precio: 3200, fechaCreacion: d(-5), fechaEntrega: d(0), etapa: 'encuadernacion', checklist: chkOk, historial: [{ etapa: 'oficina', fecha: new Date(Date.now() - 5 * 864e5).toISOString(), usuario: 'Ana García' }] },
    { ...base, id: 'o6', folio: 'OT-0006', clienteId: 'c3', clienteNombre: 'Café Central', cotizacionId: 'q4', ordenCompra: 'OC-31', producto: 'Papel', cantidad: 200, medida: 'Carta', material: 'Cartulina couché', presentacion: 'Paquetes', precio: 4000, requierePrueba: true, disenoAutorizado: false, consumoDescontado: false, consumo: 2, fechaCreacion: d(-1), fechaEntrega: d(3), etapa: 'oficina', checklist: chkNo, historial: [{ etapa: 'oficina', fecha: new Date(Date.now() - 864e5).toISOString(), usuario: 'Ana García' }] },
    { ...base, id: 'o7', folio: 'OT-0007', clienteId: 'c4', clienteNombre: 'Constructora Delta', cotizacionId: 'q5', ordenCompra: 'OC-5502', producto: 'Vinil', cantidad: 15, medida: 'Rollo 1.2 m', material: 'Vinil blanco', presentacion: 'Rollo', precio: 6300, fechaCreacion: d(-8), fechaEntrega: d(1), etapa: 'entrega', checklist: chkOk, historial: [{ etapa: 'oficina', fecha: new Date(Date.now() - 8 * 864e5).toISOString(), usuario: 'Ana García' }] }
  ];

  const entregas = [
    { id: 'e1', ordenId: 'o7', folio: 'OT-0007', clienteId: 'c4', clienteNombre: 'Constructora Delta', almacen: 'Oficinas Delta, Blvd. del Parque 800', horario: 'Lun–Vie 9:00–17:00', fecha: d(1), repartidor: 'Jorge Ramírez', estado: 'Pendiente' }
  ];

  const facturas = [
    { id: 'f1', numero: 'FAC-0001', clienteId: 'c3', clienteNombre: 'Café Central', monto: 3900, fechaEmision: d(-125), vencimiento: d(-95), estado: 'Pagada' },
    { id: 'f2', numero: 'FAC-0002', clienteId: 'c4', clienteNombre: 'Constructora Delta', monto: 5200, fechaEmision: d(-95), vencimiento: d(-50), estado: 'Pagada' },
    { id: 'f3', numero: 'FAC-0003', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', monto: 4250, fechaEmision: d(-52), vencimiento: d(-22), estado: 'Pagada' },
    { id: 'f4', numero: 'FAC-0004', clienteId: 'c2', clienteNombre: 'Clínica San José', monto: 2400, fechaEmision: d(-39), vencimiento: d(-24), estado: 'Pagada' },
    { id: 'f5', numero: 'FAC-0005', clienteId: 'c2', clienteNombre: 'Clínica San José', monto: 1850, fechaEmision: d(-25), vencimiento: d(-10), estado: 'Pendiente' },
    { id: 'f6', numero: 'FAC-0006', clienteId: 'c1', clienteNombre: 'Grupo Horizonte', monto: 7800, fechaEmision: d(-12), vencimiento: d(18), estado: 'Pendiente' },
    { id: 'f7', numero: 'FAC-0007', clienteId: 'c3', clienteNombre: 'Café Central', monto: 2300, fechaEmision: d(-25), vencimiento: d(5), estado: 'Pendiente' }
  ];

  const usuarios = DEMO_USERS.map(u => ({ id: u.uid, nombre: u.nombre, email: u.email, rol: u.rol }));
  return { clientes, cotizaciones, ordenes, materiales, entregas, facturas, usuarios };
}
