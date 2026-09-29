import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_CONCEPTOS = '/api/bancos/conceptos';
const RUTA_REPORTE = '/api/bancos/movimientos/reporte';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let general = '';
let sinClasificar = '';

const nota = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId,
  tipo: 'credito',
  fecha: '2026-02-01',
  monto: '10.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
  conceptoId: general,
  ...cambios,
});

const concepto = (cambios: Record<string, unknown>) => ({
  nombre: 'Concepto',
  aplicaA: 'ambos',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: null,
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  ...cambios,
});

async function crearConcepto(usuario: ClienteApi, cambios: Record<string, unknown>): Promise<string> {
  const creado = await usuario.post(RUTA_CONCEPTOS, concepto(cambios));
  expect(creado.estado).toBe(201);
  return creado.cuerpo.id as string;
}

/** Como propietario de la base: una nota que quedó «Sin clasificar» (así las dejó la migración) y la auditoría. */
async function comoPropietario<Fila extends pg.QueryResultRow>(
  instruccion: string,
  valores: unknown[],
): Promise<Fila[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Fila>(instruccion, valores);
  await conexion.end();
  return rows;
}

async function notaSinClasificar(cambios: Record<string, unknown> = {}): Promise<string> {
  const creada = await cuenta.propietario.post(RUTA_NOTAS, nota(cambios));
  await comoPropietario('update bancos.movimientos set concepto_id = $1 where id = $2', [
    sinClasificar,
    creada.cuerpo.id,
  ]);
  return creada.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Conceptual',
    usuario: 'propietarioconceptual',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Conceptual');
  general = await conceptoGeneral(cuenta.propietario);
  sinClasificar = (await conceptoDeSistema(cuenta.propietario, 'sin_clasificar')).id;
});

describe('el concepto de las notas, por API', () => {
  it('la nota lleva concepto y el DTO trae su id y su nombre; sin concepto no se acepta', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota());
    const sinConcepto = await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: undefined }));

    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).toMatchObject({ conceptoId: general, conceptoNombre: 'General de prueba' });
    expect(sinConcepto.estado).toBe(400);
  });

  it('rechaza sin_clasificar, uno inactivo y uno incompatible, cada uno con su código', async () => {
    const inactivo = await crearConcepto(cuenta.propietario, { nombre: 'Inactivo', activo: false });
    const soloDebito = await crearConcepto(cuenta.propietario, { nombre: 'Solo débito', aplicaA: 'debito' });

    const conSinClasificar = await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: sinClasificar }));
    const conInactivo = await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: inactivo }));
    const conIncompatible = await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: soloDebito }));

    expect(conSinClasificar.cuerpo.error.codigo).toBe('concepto_de_sistema_no_se_elige');
    expect(conInactivo.cuerpo.error.codigo).toBe('concepto_inactivo');
    expect(conIncompatible.cuerpo.error.codigo).toBe('concepto_incompatible');
  });

  it('el concepto de otra empresa no existe para esta', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra conceptual',
      usuario: 'otroconceptual',
      modulos: ['bancos'],
    });
    const ajeno = await conceptoGeneral(otra.propietario);

    const respuesta = await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: ajeno }));

    expect(respuesta.estado).toBe(404);
  });

  it('el inverso hereda el concepto, aunque el original sea de débito', async () => {
    const soloDebito = await crearConcepto(cuenta.propietario, { nombre: 'Débito para revertir', aplicaA: 'debito' });
    const original = await cuenta.propietario.post(RUTA_NOTAS, nota({ tipo: 'debito', conceptoId: soloDebito }));

    await cuenta.propietario.post(`${RUTA_NOTAS}/${original.cuerpo.id}/anular`, {
      motivo: 'Error',
      fecha: '2026-02-05',
    });

    const inverso = (await cuenta.propietario.get(RUTA_NOTAS)).cuerpo.find(
      (n: { revierteAId: string | null }) => n.revierteAId === original.cuerpo.id,
    );
    expect(inverso).toMatchObject({ tipo: 'credito', conceptoId: soloDebito, puedeReclasificar: false });
  });

  it('el saldo inicial y las transferencias llevan sus conceptos de sistema', async () => {
    const reporte = await cuenta.propietario.get(`${RUTA_REPORTE}?cuentaBancariaId=${cuentaBancariaId}`);
    const inicial = reporte.cuerpo.filas.find((m: { saldoInicial: boolean }) => m.saldoInicial);

    expect(inicial).toMatchObject({ conceptoNombre: 'Saldo inicial', puedeReclasificar: false });
  });

  it('un concepto que ya clasifica movimientos no se elimina: se inactiva', async () => {
    const enUso = await crearConcepto(cuenta.propietario, { nombre: 'En uso' });
    await cuenta.propietario.post(RUTA_NOTAS, nota({ conceptoId: enUso }));
    const sinUso = await crearConcepto(cuenta.propietario, { nombre: 'Sin uso' });

    const noElimina = await cuenta.propietario.delete(`${RUTA_CONCEPTOS}/${enUso}`, { motivo: 'Ya no' });
    const elimina = await cuenta.propietario.delete(`${RUTA_CONCEPTOS}/${sinUso}`, { motivo: 'Ya no' });

    expect(noElimina.cuerpo.error.codigo).toBe('concepto_en_uso');
    expect(elimina.estado).toBe(204);
  });
});

describe('reclasificar por API', () => {
  it('cambia el concepto de varias notas y deja la auditoría corregir con el concepto anterior y el nuevo', async () => {
    const a = await notaSinClasificar({ fecha: '2026-01-10' });
    const b = await notaSinClasificar({ fecha: '2026-01-11' });

    const respuesta = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [a, b],
      conceptoId: general,
    });

    expect(respuesta.cuerpo).toEqual({ reclasificados: 2, sinCambio: 0 });
    expect((await cuenta.propietario.get(`${RUTA_NOTAS}/${a}`)).cuerpo).toMatchObject({ conceptoId: general });
    const auditadas = await comoPropietario<{
      registro_id: string;
      motivo: string;
      anterior: { conceptoNombre: string };
    }>(
      "select registro_id, motivo, anterior from core.auditoria where cuenta_id = $1 and accion = 'corregir' and registro_id = $2",
      [cuenta.cuentaId, a],
    );
    expect(auditadas).toEqual([
      expect.objectContaining({
        motivo: 'Reclasificado de «Sin clasificar» a «General de prueba»',
        anterior: expect.objectContaining({ conceptoNombre: 'Sin clasificar' }),
      }),
    ]);
  });

  it('arrastra al inverso y no reclasifica un inverso', async () => {
    const original = await notaSinClasificar({ fecha: '2026-03-01' });
    await cuenta.propietario.post(`${RUTA_NOTAS}/${original}/anular`, { motivo: 'Error', fecha: '2026-03-02' });
    const inverso = (await cuenta.propietario.get(RUTA_NOTAS)).cuerpo.find(
      (n: { revierteAId: string | null }) => n.revierteAId === original,
    );
    const nuevo = await crearConcepto(cuenta.propietario, { nombre: 'Para arrastrar' });

    const alInverso = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [inverso.id],
      conceptoId: nuevo,
    });
    await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, { movimientoIds: [original], conceptoId: nuevo });

    expect(alInverso.cuerpo.error.codigo).toBe('no_se_reclasifica_un_inverso');
    expect((await cuenta.propietario.get(`${RUTA_NOTAS}/${inverso.id}`)).cuerpo.conceptoId).toBe(nuevo);
  });

  it('rechaza sin_clasificar como destino y es todo o nada', async () => {
    const credito = await notaSinClasificar({ fecha: '2026-03-05' });
    const soloDebito = await crearConcepto(cuenta.propietario, { nombre: 'Solo débito 2', aplicaA: 'debito' });

    const aSinClasificar = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [credito],
      conceptoId: sinClasificar,
    });
    const incompatible = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [credito],
      conceptoId: soloDebito,
    });

    expect(aSinClasificar.cuerpo.error.codigo).toBe('concepto_de_sistema_no_se_elige');
    expect(incompatible.cuerpo.error.codigo).toBe('concepto_incompatible');
    expect((await cuenta.propietario.get(`${RUTA_NOTAS}/${credito}`)).cuerpo.conceptoId).toBe(sinClasificar);
  });

  it('pide uno a 200 movimientos y el permiso de editar notas', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura de notas',
      permisos: ['bancos.notas.ver'],
    });
    const id = await notaSinClasificar({ fecha: '2026-03-06' });

    const vacia = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [],
      conceptoId: general,
    });
    const sinPermiso = await lector.post(`${RUTA_NOTAS}/reclasificar`, { movimientoIds: [id], conceptoId: general });

    expect(vacia.estado).toBe(400);
    expect(sinPermiso.estado).toBe(403);
  });
});

describe('el reporte de movimientos por concepto', () => {
  it('filtra por concepto (también «Sin clasificar», con el inverso que lo hereda) y resume lo pendiente sin contar inversos', async () => {
    const cuentaAparte = await crearCuentaBancaria(cuenta.propietario, 'Reporte de conceptos');
    const nota1 = await notaSinClasificar({ cuentaBancariaId: cuentaAparte, monto: '30.00', fecha: '2026-04-01' });
    await notaSinClasificar({ cuentaBancariaId: cuentaAparte, tipo: 'debito', monto: '5.25', fecha: '2026-04-02' });
    await cuenta.propietario.post(RUTA_NOTAS, nota({ cuentaBancariaId: cuentaAparte, fecha: '2026-04-03' }));
    await cuenta.propietario.post(`${RUTA_NOTAS}/${nota1}/anular`, { motivo: 'Error', fecha: '2026-04-04' });

    const pendientes = await cuenta.propietario.get(
      `${RUTA_REPORTE}?cuentaBancariaId=${cuentaAparte}&conceptoId=${sinClasificar}`,
    );
    const todo = await cuenta.propietario.get(`${RUTA_REPORTE}?cuentaBancariaId=${cuentaAparte}`);

    expect(pendientes.cuerpo.filas.map((f: { conceptoId: string }) => f.conceptoId)).toEqual([
      sinClasificar,
      sinClasificar,
      sinClasificar,
    ]);
    expect(pendientes.cuerpo.saldoAnterior).toBeNull();
    expect(pendientes.cuerpo.sinClasificar).toEqual({ cantidad: 2, montoDeEntradas: '30.00', montoDeSalidas: '5.25' });
    expect(todo.cuerpo.sinClasificar).toEqual(pendientes.cuerpo.sinClasificar);
    expect(todo.cuerpo.saldoFinal).not.toBeNull();
  });

  it('el Excel del reporte lleva el concepto y acepta el filtro', async () => {
    const exportado = await cuenta.propietario.get(`/api/bancos/movimientos/exportar?conceptoId=${sinClasificar}`);

    expect(exportado.estado).toBe(200);
  });
});
