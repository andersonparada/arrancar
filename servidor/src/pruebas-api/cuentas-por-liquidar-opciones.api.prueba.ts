/**
 * Las listas que piden las ventanas de Cuentas por liquidar (CL-5): las cuentas y chequeras de Bancos para entregar y para
 * reembolsar, y los conceptos de gasto. Quien las pide no necesita permisos de Bancos ni del libro, solo el de su acción.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { EscenarioDeAnticipos } from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-liquidar';
let e: EscenarioDeAnticipos;
let entrega: ClienteApi;
let liquida: ClienteApi;
let registra: ClienteApi;
let soloVer: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxlopciones');
  const usuarioCon = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Opciones', permisos });
  entrega = await usuarioCon('Entrega', ['cuentas-por-liquidar.anticipos.crear']);
  liquida = await usuarioCon('Liquida', ['cuentas-por-liquidar.anticipos.liquidar']);
  registra = await usuarioCon('Registra', ['cuentas-por-liquidar.gastos.crear']);
  soloVer = await usuarioCon('Mira', ['cuentas-por-liquidar.anticipos.ver']);
});

describe('las cuentas y chequeras', () => {
  it('quien entrega las ve con el saldo como texto y la chequera con su siguiente cheque, sin permisos de Bancos', async () => {
    const respuesta = await entrega.get(`${RUTA}/medios-para-entregar`);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const cuenta = respuesta.cuerpo.cuentas.find(
      (c: { cuentaBancariaId: string }) => c.cuentaBancariaId === e.cuentaBancariaId,
    );
    expect(cuenta.nombre).toBe('Cuenta de anticipos');
    expect(cuenta.saldo).toMatch(/^\d+\.\d{2}$/);
    expect(cuenta.chequeras[0]).toMatchObject({ chequeraId: e.chequeraId });
    expect(typeof cuenta.chequeras[0].siguienteNumero).toBe('number');
  });

  it('quien liquida las ve para el reembolso', async () => {
    const respuesta = await liquida.get(`${RUTA}/medios-para-liquidar`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.cuentas.length).toBeGreaterThan(0);
  });

  it('cada lista pide el permiso de su acción', async () => {
    expect((await soloVer.get(`${RUTA}/medios-para-entregar`)).estado).toBe(403);
    expect((await entrega.get(`${RUTA}/medios-para-liquidar`)).estado).toBe(403);
    expect((await liquida.get(`${RUTA}/medios-para-entregar`)).estado).toBe(403);
  });
});

describe('los conceptos de gasto', () => {
  it('quien registra gastos los ve por nombre, solo los activos', async () => {
    await e.propietario().post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Alimentación',
      tipoPorOmision: 'servicio',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    });
    await e.propietario().post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Concepto apagado',
      tipoPorOmision: 'servicio',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: false,
    });

    const respuesta = await registra.get(`${RUTA}/conceptos-de-gasto`);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.map((c: { nombre: string }) => c.nombre)).toEqual(['Alimentación', 'Viáticos']);
  });

  it('sin el permiso de registrar gastos no se ven', async () => {
    expect((await soloVer.get(`${RUTA}/conceptos-de-gasto`)).estado).toBe(403);
  });
});
