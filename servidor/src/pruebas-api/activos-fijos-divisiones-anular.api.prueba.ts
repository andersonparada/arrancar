/**
 * Anular una división y separar en unidades (AFI-5): la anulación borra el activo nuevo y devuelve todo al origen, solo se
 * hace sin movimientos posteriores y en un mes abierto; «Separar en unidades» reparte el centavo y se deshace de la última
 * división a la primera.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, crearUbicaciones, datosDeActivo } from './soporte/escenario-de-activos.js';
import {
  ACTIVOS,
  DIVISIONES,
  auditoriaDe,
  cerrarMes,
  dividir,
  ficha,
  grupoEnUso,
  tramosDe,
} from './soporte/escenario-de-divisiones.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let claseId: string;
let anulable: string;
let conTraslado: string;
let centavo: string;
let cerrable: string;

const anular = (divisionId: string) =>
  cuenta.propietario.post(`${DIVISIONES}/${divisionId}/anular`, { motivo: 'Fue un error' });
const separar = (id: string, cambios: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`${ACTIVOS}/${id}/separar-en-unidades`, {
    fecha: '2026-11-10',
    motivo: 'Cada una con su etiqueta',
    ...cambios,
  });

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Divisiones anular', usuario: 'propietariodivanular', modulos });
  claseId = await claseDe(cuenta, 'Instalaciones y mobiliario');
  anulable = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
  conTraslado = await grupoEnUso(cuenta, claseId, { cantidad: 10, monto: '3000.00' });
  centavo = await grupoEnUso(cuenta, claseId, { cantidad: 4, monto: '1000.01' });
  cerrable = await grupoEnUso(cuenta, claseId, { cantidad: 6, monto: '1800.00' });
  await cerrarMes(cuenta, '2026-09-01');
  await cerrarMes(cuenta, '2026-10-01');
});

describe('anular una división', () => {
  it('borra el activo nuevo, devuelve cantidad, costo y tramos al origen y deja la auditoría con los dos activos', async () => {
    const hecha = (await dividir(cuenta, anulable, { cantidad: 4 })).cuerpo;

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'anulada',
      activoNuevoId: null,
      codigoDelActivoNuevo: hecha.codigoDelActivoNuevo,
      motivoDeAnulacion: 'Fue un error',
    });
    expect((await cuenta.propietario.get(`${ACTIVOS}/${hecha.activoNuevoId}`)).estado).toBe(404);
    expect(await ficha(cuenta, anulable)).toMatchObject({ cantidad: 10, costo: '3000.00', valorResidual: '0.00' });
    for (const libro of ['contable', 'fiscal'] as const)
      expect((await tramosDe(cuenta, anulable, libro)).map((tramo) => tramo.causa)).toEqual(['inicio_de_uso']);
    const [fila] = await auditoriaDe(hecha.id, 'anular');
    expect(Object.keys(fila!.anterior).sort()).toEqual(['division', 'nuevo', 'origen']);
    expect(fila!.anterior.nuevo).toMatchObject({ cantidad: 4, costo: '1200.00' });
  });

  it('no se anula dos veces, y después de anular el activo se divide otra vez y el código queda libre', async () => {
    const hecha = (await dividir(cuenta, anulable, { cantidad: 4, codigo: 'SILLA-X' })).cuerpo;
    await anular(hecha.id);

    const otra = await anular(hecha.id);
    const nueva = await dividir(cuenta, anulable, { cantidad: 4, codigo: 'SILLA-X' });

    expect(otra.cuerpo.error.codigo).toBe('division_no_anulable');
    expect(nueva.estado, JSON.stringify(nueva.cuerpo)).toBe(201);
    expect(await comoPropietario("select 1 from activos_fijos.divisiones where estado = 'anulada'", [])).toHaveLength(
      2,
    );
  });

  it('con un traslado del activo nuevo después de la división ya no se anula', async () => {
    const ubicacion = await crearUbicaciones(cuenta);
    const hecha = (await dividir(cuenta, conTraslado, { cantidad: 5 })).cuerpo;
    const traslado = await cuenta.propietario.post('/api/activos-fijos/traslados', {
      fecha: '2026-11-15',
      ...ubicacion,
      responsable: 'Marta López',
      recibidoPor: 'Marta López',
      motivo: 'Entrega',
      renglones: [{ activoId: hecha.activoNuevoId }],
    });
    expect(traslado.estado, JSON.stringify(traslado.cuerpo)).toBe(201);

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
  });

  it('un activo con tramos de una división no vuelve a construcción', async () => {
    const respuesta = await cuenta.propietario.post(`${ACTIVOS}/${conTraslado}/quitar-de-uso`, {});

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('activo_con_divisiones');
  });

  it('un activo con divisiones no se elimina ni cambia su cantidad a mano', async () => {
    const eliminado = await cuenta.propietario.delete(`${ACTIVOS}/${conTraslado}`);

    expect(eliminado.estado).toBe(422);
    expect(eliminado.cuerpo.error.codigo).toBe('activo_con_movimientos');
  });
});

describe('separar en unidades', () => {
  const costos = async (ids: string[]) => Promise.all(ids.map(async (id) => (await ficha(cuenta, id)).costo));

  it('reparte Q1,000.01 entre 4 piezas con el centavo en la penúltima división y respeta los códigos escritos', async () => {
    const respuesta = await separar(centavo, { codigos: ['SIL-A', 'SIL-B'] });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const divisiones = respuesta.cuerpo as Array<{
      activoNuevoId: string;
      codigoDelActivoNuevo: string;
      causa: string;
    }>;
    expect(divisiones.map((d) => d.codigoDelActivoNuevo).slice(0, 2)).toEqual(['SIL-A', 'SIL-B']);
    expect(divisiones.every((d) => d.causa === 'separar_en_unidades')).toBe(true);
    expect(await costos([...divisiones.map((d) => d.activoNuevoId), centavo])).toEqual([
      '250.00',
      '250.00',
      '250.01',
      '250.00',
    ]);
    expect(await ficha(cuenta, centavo)).toMatchObject({ cantidad: 1 });
  });

  it('ni un centavo se pierde en las depreciaciones de las cuatro piezas', async () => {
    const hijos = (await ficha(cuenta, centavo)).divisiones.map((d: { activoNuevoId: string }) => d.activoNuevoId);

    for (const libro of ['contable', 'fiscal'] as const) {
      const todos = [centavo, ...hijos];
      const porDepreciar = await Promise.all(
        todos.map(async (id) => Number((await tramosDe(cuenta, id, libro)).at(-1)!.porDepreciar) * 100),
      );
      expect(Math.round(porDepreciar.reduce((suma, valor) => suma + valor, 0))).toBe(96_667);
    }
  });

  it('se deshace de la última división a la primera', async () => {
    const divisiones = (await ficha(cuenta, centavo)).divisiones as Array<{ id: string; fecha: string }>;
    const [ultima, , primera] = [...divisiones];

    const bloqueada = await anular(primera!.id);
    const sinHijo = await anular(ultima!.id);

    expect(bloqueada.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
    expect(sinHijo.estado, JSON.stringify(sinHijo.cuerpo)).toBe(200);
    expect(await ficha(cuenta, centavo)).toMatchObject({ cantidad: 2 });
  });

  it('rechaza códigos repetidos o ya usados, un activo de una pieza y más de 200 piezas', async () => {
    const repetidos = await separar(cerrable, { codigos: ['X-1', 'X-1'] });
    const usado = await separar(cerrable, { codigos: ['SIL-A'] });
    const unaPieza = await separar(await grupoSinUso(1));
    const muchas = await separar(await grupoSinUso(201));

    expect(repetidos.cuerpo.error.codigo).toBe('codigos_de_unidades_repetidos');
    expect(usado.cuerpo.error.codigo).toBe('codigos_de_unidades_repetidos');
    expect(unaPieza.cuerpo.error.codigo).toBe('division_invalida');
    expect(muchas.cuerpo.error.codigo).toBe('demasiadas_unidades');
  });
});

/** Un activo en construcción con esa cantidad: solo sirve para probar las reglas de la separación. */
async function grupoSinUso(cantidad: number): Promise<string> {
  const creado = await cuenta.propietario.post(ACTIVOS, datosDeActivo(claseId, { cantidad }));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  return creado.cuerpo.id as string;
}

describe('con noviembre cerrado', () => {
  it('una división de noviembre ya no se anula', async () => {
    const hecha = (await dividir(cuenta, cerrable, { cantidad: 2 })).cuerpo;
    await cerrarMes(cuenta, '2026-11-01');

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('mes_cerrado');
  });
});
