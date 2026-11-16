/**
 * La lista de retiros de efectivo (CP4-E2): por estado, con fecha de corte (los retiros por liquidar y el efectivo en manos
 * de custodios al cierre, con el disponible al corte), el filtro de «con disponible» y la paginación.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  registrarRetiro,
  retiroConCheque,
  retiroConNota,
  RUTA_DE_RETIROS,
  sembrarPagoDelRetiro,
} from './soporte/cuentas-por-pagar-retiros.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY, primerDiaDelMes } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let abierto: string;
let anulado: string;
let liquidado: string;
let tardio: string;

interface Fila {
  id: string;
  estado: string;
  pagado: string;
  disponible: string;
  deMesAnterior: boolean;
}

const lista = async (consulta = '') => {
  const respuesta = await e.propietario().get(`${RUTA_DE_RETIROS}${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo as { elementos: Fila[]; total: number; totalDisponible: string };
};

const ids = (pagina: { elementos: Fila[] }) => pagina.elementos.map(({ id }) => id);

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpretiroslista');
  const propietario = e.propietario();
  const { cargo } = await e.proveedorConCargo();
  abierto = (await registrarRetiro(propietario, retiroConCheque(e, '200.00', { fecha: primerDiaDelMes(-1) }))).id;
  await sembrarPagoDelRetiro(abierto, cargo, { monto: '50.00', fecha: HOY });
  anulado = (await registrarRetiro(propietario, retiroConNota(e, '300.00', { fecha: haceDias(3) }))).id;
  await propietario.post(`${RUTA_DE_RETIROS}/${anulado}/anular`, { motivo: 'Error', fecha: HOY });
  liquidado = (await registrarRetiro(propietario, retiroConCheque(e, '100.00'))).id;
  await propietario.post(`${RUTA_DE_RETIROS}/${liquidado}/liquidar`, { devuelto: '100.00', faltante: '0.00' });
  tardio = (await registrarRetiro(propietario, retiroConCheque(e, '80.00', { fecha: haceDias(2) }))).id;
  await propietario.post(`${RUTA_DE_RETIROS}/${tardio}/liquidar`, { devuelto: '80.00', faltante: '0.00' });
});

describe('por estado', () => {
  it('por omisión trae solo los abiertos, con lo pagado y lo que queda', async () => {
    const pagina = await lista();

    expect(ids(pagina)).toEqual([abierto]);
    expect(pagina.elementos[0]).toMatchObject({ pagado: '50.00', disponible: '150.00', estado: 'abierto' });
    expect(pagina).toMatchObject({ total: 1, totalDisponible: '150.00' });
  });

  it('también por liquidado, anulado o todos, y solo con disponible', async () => {
    expect(ids(await lista('?estado=liquidado')).sort()).toEqual([liquidado, tardio].sort());
    expect(ids(await lista('?estado=anulado'))).toEqual([anulado]);
    expect((await lista('?estado=todos')).total).toBe(4);
    expect(ids(await lista('?estado=todos&soloConDisponible=true'))).toEqual([abierto]);
  });

  it('pagina y respeta el total', async () => {
    const segunda = await lista('?estado=todos&limite=1&pagina=2');

    expect(segunda.elementos).toHaveLength(1);
    expect(segunda.total).toBe(4);
  });

  it('un corte con formato malo se rechaza', async () => {
    const respuesta = await e.propietario().get(`${RUTA_DE_RETIROS}?corte=ayer`);

    expect(respuesta.estado).toBe(400);
  });
});

describe('con fecha de corte: los retiros por liquidar al cierre', () => {
  it('al cierre del mes anterior solo estaba el retiro abierto de entonces, con todo su efectivo', async () => {
    const pagina = await lista(`?corte=${primerDiaDelMes(-1)}`);

    expect(ids(pagina)).toEqual([abierto]);
    expect(pagina.elementos[0]).toMatchObject({ pagado: '0.00', disponible: '200.00' });
    expect(pagina.totalDisponible).toBe('200.00');
  });

  it('ayer también estaban el retiro que hoy está anulado y el que se liquidó hoy; el de hoy aún no existía', async () => {
    const pagina = await lista(`?corte=${haceDias(1)}`);

    expect(ids(pagina).sort()).toEqual([abierto, anulado, tardio].sort());
    expect(pagina.totalDisponible).toBe('580.00');
  });

  it('hoy ya no cuentan el anulado ni el liquidado, y el abierto muestra lo pagado hasta hoy', async () => {
    const pagina = await lista(`?corte=${HOY}`);

    expect(ids(pagina)).toEqual([abierto]);
    expect(pagina.elementos[0]).toMatchObject({ pagado: '50.00', disponible: '150.00' });
    expect(pagina.totalDisponible).toBe('150.00');
  });
});
