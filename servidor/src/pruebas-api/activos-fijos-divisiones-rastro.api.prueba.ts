/**
 * Anular una división cuando el activo nuevo dejó rastro que no se puede borrar (AFI-5): las cuotas sin efecto de un mes
 * reabierto se borran y quedan en la auditoría; una mejora o una baja anulada impide anular; y un costo anterior a la
 * división no se anula en el origen mientras la división siga vigente.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import {
  ACTIVOS,
  DEPRECIACION,
  DIVISIONES,
  auditoriaDe,
  cerrarMes,
  dividir,
  ficha,
  grupoEnUso,
} from './soporte/escenario-de-divisiones.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let claseId: string;
let reabierta: string;
let conMejora: string;
let conBaja: string;

const anular = (divisionId: string) =>
  cuenta.propietario.post(`${DIVISIONES}/${divisionId}/anular`, { motivo: 'Fue un error' });

const existe = async (activoId: string) => (await cuenta.propietario.get(`${ACTIVOS}/${activoId}`)).estado === 200;

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Divisiones rastro', usuario: 'propietariodivrastro', modulos });
  claseId = await claseDe(cuenta, 'Instalaciones y mobiliario');
  reabierta = await grupoEnUso(cuenta, claseId, { cantidad: 6, monto: '1800.00' });
  conMejora = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
  conBaja = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
});

describe('mes reabierto', () => {
  it('las cuotas sin efecto del activo nuevo se borran con él y quedan en la auditoría', async () => {
    const origen = reabierta;
    await cerrarMes(cuenta, '2026-09-01');
    const hecha = (await dividir(cuenta, origen, { cantidad: 2, fecha: '2026-10-20' })).cuerpo;
    await cerrarMes(cuenta, '2026-10-01');
    const reabierto = await cuenta.propietario.post(`${DEPRECIACION}/2026-10-01/reabrir`, { motivo: 'Corregir' });
    expect(reabierto.estado, JSON.stringify(reabierto.cuerpo)).toBe(200);
    const sinEfecto = 'select 1 from activos_fijos.cuotas where activo_id = $1 and not vigente';
    expect(await comoPropietario(sinEfecto, [hecha.activoNuevoId])).not.toHaveLength(0);

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await existe(hecha.activoNuevoId)).toBe(false);
    expect(await comoPropietario(sinEfecto, [hecha.activoNuevoId])).toHaveLength(0);
    const [fila] = await auditoriaDe(hecha.id, 'anular');
    expect((fila!.anterior.cuotasSinEfectoDelNuevo as unknown[]).length).toBeGreaterThan(0);
    expect(await ficha(cuenta, origen)).toMatchObject({ cantidad: 6, costo: '1800.00' });
    await cerrarMes(cuenta, '2026-10-01');
  });
});

describe('mejora o baja anulada del activo nuevo', () => {
  const MEJORAS = '/api/activos-fijos/mejoras';
  const BAJAS = '/api/activos-fijos/bajas';
  it('con una mejora anulada la división no se anula, con un mensaje claro y sin borrar nada', async () => {
    const hecha = (await dividir(cuenta, conMejora, { cantidad: 4 })).cuerpo;
    const mejora = await cuenta.propietario.post(MEJORAS, {
      activoId: hecha.activoNuevoId,
      clase: 'mejora',
      fecha: '2026-11-20',
      descripcion: 'Refuerzo',
      lineas: [],
      costosManuales: [{ claseDeCosto: 'otro', monto: '50.00', documentoDeSoporte: 'Factura 55' }],
    });
    expect(mejora.estado, JSON.stringify(mejora.cuerpo)).toBe(201);
    await cuenta.propietario.post(`${MEJORAS}/${mejora.cuerpo.id}/anular`, { motivo: 'Era gasto' });

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
    expect(respuesta.cuerpo.error.mensaje).toContain('mejora o una baja');
    expect(await existe(hecha.activoNuevoId)).toBe(true);
  });

  it('con una baja anulada tampoco', async () => {
    const hecha = (await dividir(cuenta, conBaja, { cantidad: 4 })).cuerpo;
    const baja = await cuenta.propietario.post(BAJAS, {
      activoId: hecha.activoNuevoId,
      fecha: '2026-11-20',
      causa: 'destruccion',
      descripcion: 'Quedó inservible',
      autorizadaPor: 'Gerencia',
    });
    expect(baja.estado, JSON.stringify(baja.cuerpo)).toBe(201);
    await cuenta.propietario.post(`${BAJAS}/${baja.cuerpo.id}/anular`, { motivo: 'Error' });

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
    expect(await existe(hecha.activoNuevoId)).toBe(true);
  });
});

describe('costo anterior a la división', () => {
  it('no se anula en el origen mientras la división esté vigente; anulada la división, sí', async () => {
    const creado = await cuenta.propietario.post(ACTIVOS, datosDeActivo(claseId, { cantidad: 4 }));
    const id = creado.cuerpo.id as string;
    const costo = (monto: string, soporte: string) =>
      cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
        claseDeCosto: 'adquisicion',
        fecha: '2026-09-05',
        monto,
        documentoDeSoporte: soporte,
      });
    await costo('300.00', 'Factura 1');
    const segundo = (await costo('100.00', 'Factura 2')).cuerpo;
    const hecha = (await dividir(cuenta, id, { cantidad: 2 })).cuerpo;

    const rechazado = await cuenta.propietario.post(`/api/activos-fijos/costos/${segundo.id}/anular`, {
      motivo: 'Error',
    });

    expect(rechazado.estado).toBe(422);
    expect(rechazado.cuerpo.error.codigo).toBe('costo_anterior_a_division');
    expect(await ficha(cuenta, id)).toMatchObject({ costo: '200.00' });
    await anular(hecha.id);
    const permitido = await cuenta.propietario.post(`/api/activos-fijos/costos/${segundo.id}/anular`, {
      motivo: 'Error',
    });
    expect(permitido.estado, JSON.stringify(permitido.cuerpo)).toBe(200);
    expect(await ficha(cuenta, id)).toMatchObject({ costo: '300.00' });
  });
});
