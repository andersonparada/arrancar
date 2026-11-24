/**
 * El orden de las anulaciones de divisiones (AFI-5): de la última a la primera cada paso repone los tramos y las cuotas de
 * la división anterior, un costo posterior en cualquiera de los dos activos la bloquea y lo que cuenta es el mes de la
 * fecha de la división, aunque sus tramos arranquen el mes siguiente.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import {
  ACTIVOS,
  DIVISIONES,
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

const anular = (divisionId: string) =>
  cuenta.propietario.post(`${DIVISIONES}/${divisionId}/anular`, { motivo: 'Fue un error' });

/** Un grupo de 4 piezas que aún no se pone en uso, con su costo: se divide sin libros. */
async function grupoEnConstruccion(monto: string): Promise<string> {
  const creado = await cuenta.propietario.post(ACTIVOS, datosDeActivo(claseId, { cantidad: 4 }));
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const costo = await cuenta.propietario.post(`${ACTIVOS}/${creado.cuerpo.id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto,
    documentoDeSoporte: 'Factura 200',
  });
  expect(costo.estado, JSON.stringify(costo.cuerpo)).toBe(201);
  return creado.cuerpo.id as string;
}

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Divisiones orden', usuario: 'propietariodivorden', modulos });
  claseId = await claseDe(cuenta, 'Instalaciones y mobiliario');
});

describe('anular de la última división a la primera', () => {
  it('cada paso deja los tramos de la división anterior y al final el tramo de inicio de uso', async () => {
    const origen = await grupoEnUso(cuenta, claseId, { cantidad: 4, monto: '1200.00' });
    const separadas = await cuenta.propietario.post(`${ACTIVOS}/${origen}/separar-en-unidades`, {
      fecha: '2026-11-10',
      motivo: 'Cada una con su etiqueta',
    });
    expect(separadas.estado, JSON.stringify(separadas.cuerpo)).toBe(201);
    const recientesPrimero = (await ficha(cuenta, origen)).divisiones as Array<{ id: string }>;

    const pasos: Array<[number, string, string]> = [
      [2, '600.00', '10.00'],
      [3, '900.00', '15.00'],
      [4, '1200.00', '20.00'],
    ];
    for (const [indice, [cantidad, costo, cuota]] of pasos.entries()) {
      const respuesta = await anular(recientesPrimero[indice]!.id);
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
      expect(await ficha(cuenta, origen)).toMatchObject({ cantidad, costo });
      for (const libro of ['contable', 'fiscal'] as const) {
        const tramos = await tramosDe(cuenta, origen, libro);
        expect(
          tramos.map((tramo) => tramo.causa),
          `${libro} con ${cantidad} piezas`,
        ).toEqual(cantidad === 4 ? ['inicio_de_uso'] : ['inicio_de_uso', 'division']);
        expect(tramos.at(-1)!.cuotaMensual).toBe(cuota);
      }
    }
  });
});

describe('costos posteriores a la división', () => {
  it('un costo agregado al activo nuevo impide anular y no se borra', async () => {
    const origen = await grupoEnConstruccion('400.00');
    const hecha = (await dividir(cuenta, origen, { cantidad: 2 })).cuerpo;
    const costo = await cuenta.propietario.post(`${ACTIVOS}/${hecha.activoNuevoId}/costos`, {
      claseDeCosto: 'flete',
      fecha: '2026-11-12',
      monto: '77.00',
      documentoDeSoporte: 'Flete 9',
    });
    expect(costo.estado, JSON.stringify(costo.cuerpo)).toBe(201);

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
    const filas = await comoPropietario(
      "select 1 from activos_fijos.costos where activo_id = $1 and estado = 'vigente' and monto = 77",
      [hecha.activoNuevoId],
    );
    expect(filas).toHaveLength(1);
    expect(await ficha(cuenta, origen)).toMatchObject({ cantidad: 2, costo: '200.00' });
  });
});

describe('el mes de la fecha de la división', () => {
  it('con el primer mes en «mes_siguiente» y el mes de la fecha cerrado ya no se anula', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    const regla = await entorno.soporte.put('/api/configuracion/activos-fijos.depreciacion.primer_mes', {
      nivel: 'empresa',
      valor: 'mes_siguiente',
    });
    expect(regla.estado, JSON.stringify(regla.cuerpo)).toBe(204);
    const origen = await grupoEnUso(cuenta, claseId, { cantidad: 4, monto: '1200.00', inicioDeUso: '2026-10-05' });
    const hecha = (await dividir(cuenta, origen, { cantidad: 2, fecha: '2026-10-20' })).cuerpo;
    expect(hecha.periodo).toBe('2026-11-01');
    await cerrarMes(cuenta, '2026-09-01');
    await cerrarMes(cuenta, '2026-10-01');

    const respuesta = await anular(hecha.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('mes_cerrado');
    expect((await cuenta.propietario.get(`${ACTIVOS}/${hecha.activoNuevoId}`)).estado).toBe(200);
  });
});
