import pg from 'pg';
import { expect } from 'vitest';
import { configuracion } from '../../configuracion.js';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { conceptoDeSistema, crearCuentaBancaria } from './escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';

/**
 * Una empresa con dos cuentas (A y B, cada una con saldo inicial de Q 1,000.00 el 2026-01-01), conceptos de las tres
 * actividades y movimientos en enero, febrero y marzo de 2026 que cubren los casos del flujo de efectivo.
 */
export interface EscenarioDeFlujo {
  cuenta: CuentaDePrueba;
  cuentaA: string;
  cuentaB: string;
  concepto: Record<'ventas' | 'proveedores' | 'activo' | 'prestamo' | 'fondo' | 'sinClasificar', string>;
}

interface DatosDeNota {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  conceptoId: string;
}

async function crearConcepto(usuario: ClienteApi, nombre: string, cambios: Record<string, unknown>): Promise<string> {
  const creado = await usuario.post('/api/bancos/conceptos', {
    nombre,
    aplicaA: 'ambos',
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: null,
    esCargoBancario: false,
    pideDatosDeIntereses: false,
    admiteFactura: false,
    activo: true,
    ...cambios,
  });
  expect(creado.cuerpo, nombre).toMatchObject({ id: expect.any(String) });
  return creado.cuerpo.id as string;
}

async function registrarNota(usuario: ClienteApi, datos: DatosDeNota): Promise<string> {
  const creada = await usuario.post('/api/bancos/notas', {
    ...datos,
    referencia: null,
    beneficiario: null,
    observaciones: null,
  });
  expect(creada.estado).toBe(201);
  return creada.cuerpo.id as string;
}

/** Como propietario de la base: deja una nota «Sin clasificar», como las dejó la migración de H3b. */
async function dejarSinClasificar(movimientoId: string, conceptoId: string): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('update bancos.movimientos set concepto_id = $1 where id = $2', [conceptoId, movimientoId]);
  await conexion.end();
}

/** Concilia y autoriza enero de 2026 marcando solo el saldo inicial: el cheque queda en circulación en un mes cerrado. */
async function conciliarEnero(escenario: EscenarioDeFlujo, autoriza: ClienteApi): Promise<void> {
  const { propietario } = escenario.cuenta;
  const cuentaBancariaId = escenario.cuentaA;
  const iniciada = await propietario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 1 });
  const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
  const candidatos = iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>;
  await propietario.put(`${ruta}/marcas`, { movimientoIds: [candidatos.find((m) => m.saldoInicial)!.id] });
  await propietario.post(`${ruta}/terminar`, {});
  expect((await autoriza.post(`${ruta}/autorizar`, {})).estado).toBe(200);
}

/** Un cheque de Q 80 en enero de la cuenta A, en circulación en un mes cerrado, anulado en marzo con su nota inversa. */
async function chequeAnuladoEnOtroMes(escenario: EscenarioDeFlujo, autoriza: ClienteApi): Promise<void> {
  const { propietario } = escenario.cuenta;
  const ruta = `/api/bancos/cuentas-bancarias/${escenario.cuentaA}`;
  await propietario.post(`${ruta}/chequeras`, { serie: null, desde: 1, hasta: 10 });
  const siguiente = await propietario.get(`${ruta}/siguiente-cheque`);
  const emitido = await propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
    fecha: '2026-01-15',
    monto: '80.00',
    beneficiario: 'Proveedor',
    noNegociable: true,
    conceptoId: escenario.concepto.proveedores,
    referencia: null,
    observaciones: null,
  });
  expect(emitido.estado).toBe(200);
  await conciliarEnero(escenario, autoriza);
  const anulado = await propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/anular`, {
    motivo: 'Nunca se cobró',
    fecha: '2026-03-05',
  });
  expect(anulado.estado).toBe(200);
}

async function movimientosDeFebrero(escenario: EscenarioDeFlujo): Promise<void> {
  const { propietario } = escenario.cuenta;
  const { cuentaA, cuentaB, concepto } = escenario;
  const notaDe = (cuentaBancariaId: string) => (datos: Omit<DatosDeNota, 'cuentaBancariaId'>) =>
    registrarNota(propietario, { cuentaBancariaId, ...datos });
  const enA = notaDe(cuentaA);
  await enA({ tipo: 'credito', fecha: '2026-02-05', monto: '500.00', conceptoId: concepto.ventas });
  await enA({ tipo: 'debito', fecha: '2026-02-06', monto: '200.00', conceptoId: concepto.proveedores });
  await enA({ tipo: 'debito', fecha: '2026-02-10', monto: '50.00', conceptoId: concepto.activo });
  await notaDe(cuentaB)({ tipo: 'credito', fecha: '2026-02-12', monto: '300.00', conceptoId: concepto.prestamo });
  await enA({ tipo: 'debito', fecha: '2026-02-20', monto: '30.00', conceptoId: concepto.fondo });
  const pendiente = await enA({ tipo: 'credito', fecha: '2026-02-22', monto: '7.00', conceptoId: concepto.ventas });
  await dejarSinClasificar(pendiente, concepto.sinClasificar);
  const anulable = await enA({ tipo: 'credito', fecha: '2026-02-25', monto: '40.00', conceptoId: concepto.ventas });
  const anulada = await propietario.post(`/api/bancos/notas/${anulable}/anular`, {
    motivo: 'Error',
    fecha: '2026-02-26',
  });
  expect(anulada.estado).toBe(200);
  const transferencia = await propietario.post('/api/bancos/transferencias', {
    cuentaOrigenId: cuentaA,
    cuentaDestinoId: cuentaB,
    fecha: '2026-02-15',
    monto: '100.00',
    referencia: null,
    observaciones: null,
  });
  expect(transferencia.estado).toBe(201);
}

async function conceptosDelEscenario(usuario: ClienteApi): Promise<EscenarioDeFlujo['concepto']> {
  return {
    ventas: await crearConcepto(usuario, 'Ventas', { aplicaA: 'credito', grupoDeFlujo: 'Cobros a clientes' }),
    proveedores: await crearConcepto(usuario, 'Proveedores', {
      aplicaA: 'debito',
      grupoDeFlujo: 'Pagos a proveedores',
    }),
    activo: await crearConcepto(usuario, 'Compra de terreno', { aplicaA: 'debito', actividadDeFlujo: 'inversion' }),
    prestamo: await crearConcepto(usuario, 'Préstamo', { aplicaA: 'credito', actividadDeFlujo: 'financiamiento' }),
    fondo: await crearConcepto(usuario, 'Fondo', { actividadDeFlujo: 'ninguna' }),
    sinClasificar: (await conceptoDeSistema(usuario, 'sin_clasificar')).id,
  };
}

/** Da de alta la empresa y todos sus movimientos; `nombre` distingue al propietario entre archivos de prueba. */
export async function armarEscenarioDeFlujo(entorno: EntornoApi, nombre: string): Promise<EscenarioDeFlujo> {
  const cuenta = await darDeAltaCuenta(entorno, {
    nombre,
    usuario: `propietario${nombre.toLowerCase()}`,
    modulos: ['bancos'],
  });
  const autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: nombre,
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  const escenario: EscenarioDeFlujo = {
    cuenta,
    cuentaA: await crearCuentaBancaria(cuenta.propietario, `${nombre} A`),
    cuentaB: await crearCuentaBancaria(cuenta.propietario, `${nombre} B`),
    concepto: await conceptosDelEscenario(cuenta.propietario),
  };
  await chequeAnuladoEnOtroMes(escenario, autoriza);
  await movimientosDeFebrero(escenario);
  return escenario;
}
