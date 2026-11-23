/**
 * El total «por justificar» de la lista de anticipos (CL-2) no resta lo gastado de más: un anticipo gastado de más aporta
 * cero, igual que en el reporte CL-R1, con y sin fecha de corte.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDeAnticipos, RUTA_DE_ANTICIPOS } from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDeAnticipos;

/** Un anticipo de Q100 con Q400 de gastos y otro abierto de Q200 sin gastos. */
beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxlgastadodemas');
  const gastadoDeMas = await e.entregar(e.conCheque(await e.tercero('Gaston', 'DeMas'), '100.00'));
  await e.sembrarGasto(gastadoDeMas.id, '400.00');
  await e.entregar(e.conCheque(await e.tercero('Abel', 'Abierto'), '200.00'));
});

const pedir = async (consulta: string) => {
  const respuesta = await e.propietario().get(`${RUTA_DE_ANTICIPOS}${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

describe('el total por justificar de la lista', () => {
  it('hoy, un anticipo gastado de más no resta del total', async () => {
    const pagina = await pedir('');

    expect(pagina.total).toBe(2);
    expect(pagina.totalPorJustificar).toBe('200.00');
  });

  it('con corte, tampoco resta', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const pagina = await pedir(`?corte=${hoy}`);

    expect(pagina.total).toBe(2);
    expect(pagina.totalPorJustificar).toBe('200.00');
  });
});
