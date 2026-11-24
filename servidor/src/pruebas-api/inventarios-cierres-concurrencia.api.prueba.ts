/**
 * Concurrencia en el cierre mensual del inventario: cerrar toma el candado exclusivo del cierre y los documentos lo toman
 * compartido, así que cada documento entra antes del cierre (y está en su foto) o se rechaza con `mes_cerrado`; dos
 * cierres del mismo mes no se pisan, y cerrar el mes siguiente contra reabrir el último se turnan.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { centavosDe, CIERRES, cerrarMes, reabrirMes, renglonesDeFoto } from './soporte/escenario-de-cierres.js';
import { entrada, prepararKardex, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
const DOCUMENTOS_A_LA_VEZ = 6;
let e: EscenarioDeKardex;
let totalDelUltimoCierre = 0;

const propietario = () => e.cuenta.propietario;
const comprar = (fecha: string, costoTotal: string) =>
  entrada(propietario(), {
    bodegaId: e.bodegaId,
    fecha,
    renglones: [{ articuloId: e.articuloId, cantidad: '10', costoTotal }],
  });

/** Cierra `periodo` a la vez que varios documentos del mismo mes; devuelve cuántos entraron y qué dijeron los demás. */
async function rondaDeCierre(periodo: string, fecha: string, costoTotal: string) {
  const [cierre, ...documentos] = await Promise.all([
    cerrarMes(propietario(), periodo),
    ...Array.from({ length: DOCUMENTOS_A_LA_VEZ }, () => comprar(fecha, costoTotal)),
  ]);
  const entraron = documentos.filter((documento) => documento.estado === 201).length;
  const rechazos = documentos.filter((documento) => documento.estado !== 201).map((d) => d.cuerpo.error.codigo);
  return { cierre, entraron, rechazos, foto: centavosDe(await renglonesDeFoto(propietario(), periodo)) };
}

beforeAll(async () => {
  e = await prepararKardex(entorno, 'cierresconc');
  expect((await comprar('2026-07-01', '200.00')).estado).toBe(201);
  totalDelUltimoCierre = 0;
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('cerrar contra documentos del mismo mes', () => {
  it('cada documento entra antes del cierre y está en su foto, o se rechaza con mes_cerrado', async () => {
    const { cierre, entraron, rechazos, foto } = await rondaDeCierre('2026-07-01', '2026-07-15', '20.00');

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(rechazos.every((codigo) => codigo === 'mes_cerrado')).toBe(true);
    expect(foto).toBe(20_000 + 2_000 * entraron);
    expect(cierre.cuerpo.valorTotal).toBe(((20_000 + 2_000 * entraron) / 100).toFixed(2));
    totalDelUltimoCierre = foto;
  });

  it('lo mismo con el mes siguiente: la foto de agosto parte de lo que dejó julio', async () => {
    const { cierre, entraron, rechazos, foto } = await rondaDeCierre('2026-08-01', '2026-08-15', '30.00');

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(rechazos.every((codigo) => codigo === 'mes_cerrado')).toBe(true);
    expect(foto).toBe(totalDelUltimoCierre + 3_000 * entraron);
    totalDelUltimoCierre = foto;
  });

  it('después del cierre, ningún documento de julio ni de agosto entra', async () => {
    expect((await comprar('2026-07-30', '5.00')).cuerpo.error.codigo).toBe('mes_cerrado');
    expect((await comprar('2026-08-30', '5.00')).cuerpo.error.codigo).toBe('mes_cerrado');
  });
});

describe('cierres y reaperturas a la vez', () => {
  it('dos cierres del mismo mes: uno se guarda y el otro lo encuentra cerrado', async () => {
    const respuestas = await Promise.all([
      cerrarMes(propietario(), '2026-09-01'),
      cerrarMes(propietario(), '2026-09-01'),
    ]);

    expect(respuestas.map((r) => r.estado).sort()).toEqual([200, 422]);
    expect(respuestas.find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('mes_cerrado');
    const cerrados = (await propietario().get(CIERRES)).cuerpo.cierres.filter(
      (cierre: { periodo: string }) => cierre.periodo === '2026-09-01',
    );
    expect(cerrados).toHaveLength(1);
  });

  it('cerrar octubre contra reabrir septiembre se turnan: gana una y la otra ve el resultado', async () => {
    const [cierra, reabre] = await Promise.all([
      cerrarMes(propietario(), '2026-10-01'),
      reabrirMes(propietario(), '2026-09-01'),
    ]);

    const cerroPrimero = cierra.estado === 200 && reabre.cuerpo.error?.codigo === 'solo_se_reabre_el_ultimo';
    const reabrioPrimero = reabre.estado === 200 && cierra.cuerpo.error?.codigo === 'mes_anterior_sin_cerrar';
    expect(cerroPrimero || reabrioPrimero, JSON.stringify([cierra.cuerpo, reabre.cuerpo])).toBe(true);
    const estados = (await propietario().get(CIERRES)).cuerpo.cierres.map(
      (c: { periodo: string; estado: string }) => `${c.periodo}:${c.estado}`,
    );
    expect(estados).toEqual(
      cerroPrimero
        ? ['2026-10-01:cerrado', '2026-09-01:cerrado', '2026-08-01:cerrado', '2026-07-01:cerrado']
        : ['2026-09-01:reabierto', '2026-08-01:cerrado', '2026-07-01:cerrado'],
    );
  });

  it('dos reaperturas del último mes: una lo reabre y la otra ya no lo encuentra cerrado', async () => {
    const ultimo = (await propietario().get(CIERRES)).cuerpo.cierres.find(
      (c: { estado: string }) => c.estado === 'cerrado',
    ).periodo as string;

    const respuestas = await Promise.all([reabrirMes(propietario(), ultimo), reabrirMes(propietario(), ultimo)]);

    expect(respuestas.map((r) => r.estado).sort()).toEqual([200, 422]);
    expect(respuestas.find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('solo_se_reabre_el_ultimo');
  });
});
