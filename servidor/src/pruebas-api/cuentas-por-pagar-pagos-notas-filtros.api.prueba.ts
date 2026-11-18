/** Los filtros de `GET /pagos/notas-para-ligar`: por cuenta bancaria y por rango de fechas (CP4-5). */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, haceDias } from './soporte/escenario-de-documentos.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let otraCuenta: string;
let enLaPrimera: { reciente: string; antigua: string };
let enLaOtra: string;

async function nota(cuentaBancariaId: string, fecha: string): Promise<string> {
  const creada = await e.propietario().post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo: 'debito',
    fecha,
    monto: '100.00',
    referencia: 'Débito del banco',
    beneficiario: 'Aseguradora Prueba',
    observaciones: null,
    marcarParaCuentasPorPagar: true,
  });
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return creada.cuerpo.id;
}

const ids = async (consulta: string): Promise<string[]> => {
  const respuesta = await e.propietario().get(`${RUTA_DE_PAGOS}/notas-para-ligar?${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return (respuesta.cuerpo.elementos as Array<{ movimientoId: string }>).map((n) => n.movimientoId);
};

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosnotasfiltros');
  otraCuenta = await crearCuentaBancaria(e.propietario(), 'Otra cuenta de notas');
  enLaPrimera = {
    reciente: await nota(e.cuentaBancariaId, HOY),
    antigua: await nota(e.cuentaBancariaId, haceDias(20)),
  };
  enLaOtra = await nota(otraCuenta, HOY);
});

describe('filtros de las notas para ligar', () => {
  it('por cuenta bancaria deja solo las de esa cuenta', async () => {
    const deLaPrimera = await ids(`cuentaBancariaId=${e.cuentaBancariaId}`);
    const deLaOtra = await ids(`cuentaBancariaId=${otraCuenta}`);

    expect(deLaPrimera).toEqual(expect.arrayContaining([enLaPrimera.reciente, enLaPrimera.antigua]));
    expect(deLaPrimera).not.toContain(enLaOtra);
    expect(deLaOtra).toEqual([enLaOtra]);
  });

  it('desde y hasta recortan por la fecha de la nota, incluyendo los extremos', async () => {
    const desde = await ids(`desde=${haceDias(5)}`);
    const hasta = await ids(`hasta=${haceDias(10)}`);
    const exacto = await ids(`desde=${haceDias(20)}&hasta=${haceDias(20)}`);

    expect(desde).toEqual(expect.arrayContaining([enLaPrimera.reciente, enLaOtra]));
    expect(desde).not.toContain(enLaPrimera.antigua);
    expect(hasta).toContain(enLaPrimera.antigua);
    expect(hasta).not.toContain(enLaPrimera.reciente);
    expect(exacto).toEqual([enLaPrimera.antigua]);
  });

  it('se combinan, y una cuenta o fecha mal escritas se rechazan con 400', async () => {
    expect(await ids(`cuentaBancariaId=${e.cuentaBancariaId}&desde=${haceDias(5)}`)).toEqual([enLaPrimera.reciente]);
    const mala = await e.propietario().get(`${RUTA_DE_PAGOS}/notas-para-ligar?cuentaBancariaId=nada`);
    const fechaMala = await e.propietario().get(`${RUTA_DE_PAGOS}/notas-para-ligar?desde=ayer`);
    expect([mala.estado, fechaMala.estado]).toEqual([400, 400]);
  });
});
