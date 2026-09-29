import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearEscenarioDeSugerencias, type EscenarioDeSugerencias } from './soporte/escenario-de-sugerencias.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_CHEQUES = '/api/bancos/cheques';
const entorno = usarEntornoApi();

let cuenta: CuentaDePrueba;
let e: EscenarioDeSugerencias;
let cuentaBancariaId = '';
let sinClasificar = '';
let pagoAProveedores = '';
let mantenimiento = '';
let comisiones = '';
let deposito = '';

const notaPendiente = (cambios: Record<string, unknown> = {}) => e.notaPendiente(cambios);
const notaClasificada = (cambios: Record<string, unknown> = {}) => e.notaClasificada(cambios);
const emitirCheque = (cambios: Record<string, unknown> = {}) => e.emitirCheque(cambios);
const dejarSinClasificar = (id: string) => e.dejarSinClasificar(id);
const conceptoDe = (id: string) => e.conceptoDe(id);

async function prepararEscenario(nombre: string, usuario: string) {
  cuenta = await darDeAltaCuenta(entorno, { nombre, usuario, modulos: ['bancos'] });
  e = await crearEscenarioDeSugerencias(cuenta, nombre);
  ({ cuentaBancariaId, sinClasificar, pagoAProveedores, mantenimiento, comisiones, deposito } = e);
}

beforeAll(async () => {
  await prepararEscenario('Reclasificar y capturar', 'propietarioreclasifica');
});

describe('POST reclasificar-varios', () => {
  const RUTA = `${RUTA_NOTAS}/reclasificar-varios`;

  it('asigna un concepto a cada uno, audita con «(sugerencia aceptada)» y arrastra al inverso', async () => {
    const entrada = await notaPendiente({ tipo: 'credito', fecha: '2026-03-01' });
    const salida = await notaPendiente({ fecha: '2026-03-02' });
    const revertida = await notaPendiente({ fecha: '2026-03-03' });
    await cuenta.propietario.post(`${RUTA_NOTAS}/${revertida}/anular`, { motivo: 'Error', fecha: '2026-03-04' });
    const inverso = (await cuenta.propietario.get(RUTA_NOTAS)).cuerpo.find((n: any) => n.revierteAId === revertida);

    const respuesta = await cuenta.propietario.post(RUTA, {
      asignaciones: [
        { movimientoId: entrada, conceptoId: deposito },
        { movimientoId: salida, conceptoId: comisiones },
        { movimientoId: revertida, conceptoId: mantenimiento },
      ],
      porSugerencia: true,
    });

    expect(respuesta.cuerpo).toEqual({ reclasificados: 3, sinCambio: 0 });
    expect(await conceptoDe(entrada)).toBe(deposito);
    expect(await conceptoDe(salida)).toBe(comisiones);
    expect(await conceptoDe(inverso.id)).toBe(mantenimiento);
    const motivos = await comoPropietario<{ motivo: string }>(
      "select motivo from core.auditoria where cuenta_id = $1 and accion = 'corregir' and registro_id = $2",
      [cuenta.cuentaId, entrada],
    );
    expect(motivos).toEqual([{ motivo: 'Reclasificado de «Sin clasificar» a «Depósito» (sugerencia aceptada)' }]);
  });

  it('es todo o nada, valida el tope y los repetidos y pide bancos.notas.editar', async () => {
    const credito = await notaPendiente({ tipo: 'credito', fecha: '2026-03-10' });
    const debito = await notaPendiente({ fecha: '2026-03-11' });
    const asignacion = (movimientoId: string) => ({ movimientoId, conceptoId: deposito });

    const conError = await cuenta.propietario.post(RUTA, {
      asignaciones: [asignacion(credito), asignacion(debito)],
      porSugerencia: false,
    });
    const repetidos = await cuenta.propietario.post(RUTA, {
      asignaciones: [asignacion(credito), asignacion(credito)],
      porSugerencia: false,
    });
    const demasiados = await cuenta.propietario.post(RUTA, {
      asignaciones: Array.from({ length: 201 }, () => asignacion(credito)),
      porSugerencia: false,
    });
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector2',
      apellidos: 'Lectura de varios',
      permisos: ['bancos.notas.ver'],
    });
    const sinPermiso = await lector.post(RUTA, { asignaciones: [asignacion(credito)], porSugerencia: false });

    expect(conError.cuerpo.error.codigo).toBe('concepto_incompatible');
    expect(await conceptoDe(credito)).toBe(sinClasificar);
    expect(repetidos.estado).toBe(400);
    expect(demasiados.estado).toBe(400);
    expect(sinPermiso.estado).toBe(403);
  });
});

describe('reclasificar cheques y «Pago a proveedores» en la bandeja', () => {
  it('un cheque pendiente se clasifica como «Pago a proveedores» desde la bandeja de las notas (P3)', async () => {
    const { movimientoId } = await emitirCheque({ conceptoId: mantenimiento, beneficiario: 'Otro proveedor' });
    await dejarSinClasificar(movimientoId);

    const respuesta = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [movimientoId],
      conceptoId: pagoAProveedores,
    });

    expect(respuesta.cuerpo).toEqual({ reclasificados: 1, sinCambio: 0 });
    expect(await conceptoDe(movimientoId)).toBe(pagoAProveedores);
  });

  it('una nota de débito no recibe «Pago a proveedores»', async () => {
    const id = await notaPendiente({ fecha: '2026-03-20' });

    const respuesta = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [id],
      conceptoId: pagoAProveedores,
    });

    expect(respuesta.cuerpo.error.codigo).toBe('concepto_de_sistema_no_se_elige');
  });

  it('un cheque ya clasificado se reclasifica con bancos.cheques.reclasificar, audita corregir y no con el permiso de notas', async () => {
    const { movimientoId } = await emitirCheque({ beneficiario: 'Cheque a corregir' });
    const soloNotas = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector3',
      apellidos: 'Editor de notas',
      permisos: ['bancos.notas.editar'],
    });
    const soloCheques = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector4',
      apellidos: 'Reclasificador de cheques',
      permisos: ['bancos.cheques.reclasificar'],
    });
    const cuerpo = { movimientoIds: [movimientoId], conceptoId: mantenimiento };

    const sinPermiso = await soloNotas.post(`${RUTA_CHEQUES}/reclasificar`, cuerpo);
    const porNotas = await soloNotas.post(`${RUTA_NOTAS}/reclasificar`, cuerpo);
    const porCheques = await soloCheques.post(`${RUTA_CHEQUES}/reclasificar`, cuerpo);

    expect(sinPermiso.estado).toBe(403);
    expect(porNotas.cuerpo.error.codigo).toBe('un_cheque_se_reclasifica_como_cheque');
    expect(porCheques.cuerpo).toEqual({ reclasificados: 1, sinCambio: 0 });
    expect(await conceptoDe(movimientoId)).toBe(mantenimiento);
    const auditadas = await comoPropietario<{ motivo: string; anterior: { conceptoNombre: string } }>(
      "select motivo, anterior from core.auditoria where cuenta_id = $1 and accion = 'corregir' and registro_id = $2",
      [cuenta.cuentaId, movimientoId],
    );
    expect(auditadas).toEqual([
      expect.objectContaining({
        motivo: 'Reclasificado de «Pago a proveedores» a «Mantenimiento»',
        anterior: expect.objectContaining({ conceptoNombre: 'Pago a proveedores' }),
      }),
    ]);
  });

  it('la ruta de los cheques rechaza una nota', async () => {
    const id = await notaClasificada({ fecha: '2026-03-25' });

    const respuesta = await cuenta.propietario.post(`${RUTA_CHEQUES}/reclasificar`, {
      movimientoIds: [id],
      conceptoId: comisiones,
    });

    expect(respuesta.cuerpo.error.codigo).toBe('no_es_un_cheque_para_reclasificar');
  });
});

describe('sugerir el concepto al capturar (S6)', () => {
  it('una nota: mismo cálculo, con su permiso y sin guardar nada', async () => {
    await notaClasificada({ beneficiario: 'Captura de nota', monto: '7.50' });
    await notaClasificada({ beneficiario: 'Captura de nota', monto: '8.00', fecha: '2026-02-02' });
    const antes = await comoPropietario<{ n: string }>('select count(*) as n from bancos.movimientos', []);

    const respuesta = await cuenta.propietario.post(`${RUTA_NOTAS}/sugerir-concepto`, {
      tipo: 'debito',
      cuentaBancariaId,
      fecha: '2026-02-10',
      monto: '7.80',
      beneficiario: 'CAPTURA de nota, S.A.',
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).not.toHaveProperty('movimientoId');
    expect(respuesta.cuerpo.sugerido).toMatchObject({ conceptoId: mantenimiento });
    const despues = await comoPropietario<{ n: string }>('select count(*) as n from bancos.movimientos', []);
    expect(despues[0]?.n).toBe(antes[0]?.n);
  });

  it('una nota necesita tipo y cuenta, y se pide con bancos.notas.crear', async () => {
    const sinTipo = await cuenta.propietario.post(`${RUTA_NOTAS}/sugerir-concepto`, { cuentaBancariaId });
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector5',
      apellidos: 'Lectura de captura',
      permisos: ['bancos.notas.ver'],
    });
    const sinPermiso = await lector.post(`${RUTA_NOTAS}/sugerir-concepto`, { tipo: 'debito', cuentaBancariaId });

    expect(sinTipo.estado).toBe(400);
    expect(sinPermiso.estado).toBe(403);
  });

  it('un cheque: tipo fijo, sugiere «Pago a proveedores» y se pide con bancos.cheques.emitir', async () => {
    await emitirCheque({ beneficiario: 'Cheque sugerido' });
    await emitirCheque({ beneficiario: 'Cheque sugerido', fecha: '2026-02-06' });
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector6',
      apellidos: 'Lectura de cheques',
      permisos: ['bancos.cheques.ver'],
    });

    const respuesta = await cuenta.propietario.post(`${RUTA_CHEQUES}/sugerir-concepto`, {
      cuentaBancariaId,
      fecha: '2026-02-10',
      beneficiario: 'Cheque Sugerido',
    });
    const sinPermiso = await lector.post(`${RUTA_CHEQUES}/sugerir-concepto`, { cuentaBancariaId });

    expect(respuesta.cuerpo.sugerido).toMatchObject({ conceptoId: pagoAProveedores });
    expect(sinPermiso.estado).toBe(403);
  });
});
