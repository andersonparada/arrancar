/**
 * CL-R1 con un anticipo gastado de más (QA de CL-7): lo que la empresa aún debe reembolsar no resta de lo que los
 * beneficiarios todavía deben justificar; se muestra aparte como «a reembolsar», por anticipo, beneficiario y total.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDeGastos } from './soporte/cuentas-por-liquidar-gastos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDeGastos;

beforeAll(async () => {
  e = await EscenarioDeGastos.preparar(entorno, 'cxlsobregiro');
  const beneficiario = await e.anticipos.tercero('Sara', 'Sobregiro');
  const deMas = await e.anticipos.entregar(e.anticipos.conCheque(beneficiario, '100.00'));
  await e.anticipos.sembrarGasto(deMas.id, '400.00');
  await e.anticipos.entregar(e.anticipos.conCheque(beneficiario, '200.00'));
});

describe('CL-R1 con un anticipo gastado de más', () => {
  it('lista los dos anticipos del beneficiario', async () => {
    const respuesta = await e.propietario().get('/api/cuentas-por-liquidar/reportes/anticipos-por-liquidar');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.beneficiarios[0].anticipos).toHaveLength(2);
  });

  it('lo que falta por justificar no se reduce con lo que la empresa debe reembolsar', async () => {
    const respuesta = await e.propietario().get('/api/cuentas-por-liquidar/reportes/anticipos-por-liquidar');
    const { total, beneficiarios, porTramo } = respuesta.cuerpo;

    expect(total).toMatchObject({ porJustificar: '200.00', aReembolsar: '300.00', porJustificarVencido: '0.00' });
    expect(beneficiarios[0]).toMatchObject({ porJustificar: '200.00', aReembolsar: '300.00' });
    expect(beneficiarios[0].anticipos.map((a: { porJustificar: string }) => a.porJustificar).sort()).toEqual([
      '0.00',
      '200.00',
    ]);
    expect(porTramo.find((t: { tramo: string }) => t.tramo === 'al_dia').porJustificar).toBe('200.00');
  });
});
