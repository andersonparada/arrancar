/**
 * Anular una división cuando el activo nuevo ya tiene vida propia (AFI-5): una división suya anulada, un componente o un
 * traslado anulado lo hacen intocable (se rechaza con un mensaje claro en vez del 409 de la llave foránea); y anular un
 * costo con una división en camino no descuadra a las piezas.
 */
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, crearUbicaciones, datosDeActivo } from './soporte/escenario-de-activos.js';
import { ACTIVOS, DIVISIONES, dividir, ficha, grupoEnUso } from './soporte/escenario-de-divisiones.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let claseId: string;

const anular = (divisionId: string) =>
  cuenta.propietario.post(`${DIVISIONES}/${divisionId}/anular`, { motivo: 'Fue un error' });

const existe = async (activoId: string) => (await cuenta.propietario.get(`${ACTIVOS}/${activoId}`)).estado === 200;

function esperarRechazo(respuesta: { estado: number; cuerpo: any }) {
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
  expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
}

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Divisiones cadena', usuario: 'propietariodivcadena', modulos });
  claseId = await claseDe(cuenta, 'Instalaciones y mobiliario');
});

describe('el activo nuevo con vida propia', () => {
  it('división en cadena: con una división del nuevo anulada, la primera no se anula', async () => {
    const origen = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
    const primera = (await dividir(cuenta, origen, { cantidad: 6 })).cuerpo;
    const segunda = (await dividir(cuenta, primera.activoNuevoId, { cantidad: 2 })).cuerpo;
    expect((await anular(segunda.id)).estado).toBe(200);

    esperarRechazo(await anular(primera.id));

    expect(await existe(primera.activoNuevoId)).toBe(true);
    expect(await ficha(cuenta, origen)).toMatchObject({ cantidad: 4 });
  });

  it('con un componente del activo nuevo no se anula', async () => {
    const origen = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
    const hecha = (await dividir(cuenta, origen, { cantidad: 4 })).cuerpo;
    const parte = await cuenta.propietario.post(
      ACTIVOS,
      datosDeActivo(claseId, { descripcion: 'Parte', activoPadreId: hecha.activoNuevoId }),
    );
    expect(parte.estado, JSON.stringify(parte.cuerpo)).toBe(201);

    esperarRechazo(await anular(hecha.id));

    expect(await existe(hecha.activoNuevoId)).toBe(true);
  });

  it('con un traslado anulado del activo nuevo no se anula y la boleta anulada se conserva', async () => {
    const origen = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
    const hecha = (await dividir(cuenta, origen, { cantidad: 4 })).cuerpo;
    const traslado = await cuenta.propietario.post('/api/activos-fijos/traslados', {
      fecha: '2026-11-15',
      ...(await crearUbicaciones(cuenta)),
      responsable: 'Marta López',
      recibidoPor: 'Marta López',
      motivo: 'Entrega',
      renglones: [{ activoId: hecha.activoNuevoId }],
    });
    expect(traslado.estado, JSON.stringify(traslado.cuerpo)).toBe(201);
    const grupoId = traslado.cuerpo.grupoId ?? traslado.cuerpo.id;
    const anulado = await cuenta.propietario.post(`/api/activos-fijos/traslados/${grupoId}/anular`, {
      motivo: 'Error',
    });
    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);

    esperarRechazo(await anular(hecha.id));

    expect(await existe(hecha.activoNuevoId)).toBe(true);
  });
});

describe('anular un costo mientras otro divide el activo', () => {
  it('el costo se revisa con el activo bloqueado: si la división ganó, se rechaza', async () => {
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

    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    await conexion.query('begin');
    await conexion.query('select id from activos_fijos.activos where id = $1 for update', [id]);
    const division = dividir(cuenta, id, { cantidad: 2 });
    await new Promise((listo) => setTimeout(listo, 700));
    const anulacion = cuenta.propietario.post(`/api/activos-fijos/costos/${segundo.id}/anular`, { motivo: 'Error' });
    await new Promise((listo) => setTimeout(listo, 700));
    await conexion.query('commit');
    await conexion.end();

    const [dividida, anulada] = await Promise.all([division, anulacion]);

    expect(dividida.estado, JSON.stringify(dividida.cuerpo)).toBe(201);
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(422);
    expect(anulada.cuerpo.error.codigo).toBe('costo_anterior_a_division');
    expect(await ficha(cuenta, id)).toMatchObject({ costo: '200.00' });
  });
});
