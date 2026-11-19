/**
 * La lista y la ficha de anticipos (CL-2): por omisión los abiertos por fecha límite, con lo que falta por justificar y la
 * antigüedad; filtros por estado, beneficiario y vencidos; «por liquidar» con fecha de corte (lo gastado y lo vencido
 * entonces, y un anticipo anulado después del corte); permisos y aislamiento por empresa.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  EscenarioDeAnticipos,
  ponerFechasAlAnticipo,
  RUTA_DE_ANTICIPOS,
} from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeAnticipos;
let ana: string;
let beto: string;
let primero: { id: string; numero: string };
let segundo: { id: string; numero: string };
let anulado: { id: string; numero: string };
let soloVer: ClienteApi;
let sinPermisos: ClienteApi;

const lista = async (consulta = '') => {
  const respuesta = await e.propietario().get(`${RUTA_DE_ANTICIPOS}${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

const numerosDe = (pagina: { elementos: Array<{ numero: string }> }) => pagina.elementos.map(({ numero }) => numero);

/**
 * Tres anticipos: el de Ana de Q1,000 (hace 30 días, vence hace 10, con un gasto de Q300 de hace 20 días), el de Beto de
 * Q500 (hace 5 días, vence en 10) y uno de Ana de Q200 (hace 40 días) que se anuló hace 15 días.
 */
beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxllista');
  ana = await e.tercero('Ana', 'Lista');
  beto = await e.tercero('Beto', 'Lista');
  primero = await e.entregar(e.conCheque(ana, '1000.00'));
  await ponerFechasAlAnticipo(primero.id, haceDias(30), haceDias(10));
  await e.sembrarGasto(primero.id, '300.00', { fecha: haceDias(20) });
  segundo = await e.entregar(e.conCheque(beto, '500.00'));
  await ponerFechasAlAnticipo(segundo.id, haceDias(5), haceDias(-10));
  anulado = await e.entregar(e.conCheque(ana, '200.00'));
  expect((await e.propietario().post(`${RUTA_DE_ANTICIPOS}/${anulado.id}/anular`, { motivo: 'Error' })).estado).toBe(
    200,
  );
  await ponerFechasAlAnticipo(anulado.id, haceDias(40), haceDias(25));
  await consultar('update cuentas_por_liquidar.anticipos set fecha_de_anulacion = $2 where id = $1', [
    anulado.id,
    haceDias(15),
  ]);
  const usuarioCon = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Lista', permisos });
  soloVer = await usuarioCon('Solo mira lista', ['cuentas-por-liquidar.anticipos.ver']);
  sinPermisos = await usuarioCon('Sin nada lista', ['cuentas-por-liquidar.reportes.ver']);
});

describe('la lista de hoy', () => {
  it('por omisión trae los abiertos, los más atrasados primero, con lo que falta por justificar y el total', async () => {
    const pagina = await lista();

    expect(numerosDe(pagina)).toEqual([primero.numero, segundo.numero]);
    expect(pagina.total).toBe(2);
    expect(pagina.totalPorJustificar).toBe('1200.00');
    expect(pagina.elementos[0]).toMatchObject({
      beneficiario: 'Ana Lista',
      monto: '1000.00',
      gastado: '300.00',
      porJustificar: '700.00',
      vencido: true,
      diasVencido: 10,
      diasDesdeLaEntrega: 30,
    });
    expect(pagina.elementos[0].aviso).toContain(`El anticipo ${primero.numero} venció el`);
    expect(pagina.elementos[1]).toMatchObject({ porJustificar: '500.00', vencido: false, diasVencido: 0, aviso: null });
  });

  it('filtra por estado, por beneficiario y por vencidos', async () => {
    expect(numerosDe(await lista('?estado=anulado'))).toEqual([anulado.numero]);
    expect(numerosDe(await lista('?estado=todos'))).toHaveLength(3);
    expect(numerosDe(await lista(`?beneficiarioId=${beto}`))).toEqual([segundo.numero]);
    expect(numerosDe(await lista('?vencidos=true'))).toEqual([primero.numero]);
  });

  it('pagina', async () => {
    const pagina = await lista('?estado=todos&limite=2&pagina=2');

    expect(pagina.elementos).toHaveLength(1);
    expect(pagina.total).toBe(3);
  });

  it('rechaza un corte mal escrito y un límite exagerado', async () => {
    expect((await e.propietario().get(`${RUTA_DE_ANTICIPOS}?corte=ayer`)).estado).toBe(400);
    expect((await e.propietario().get(`${RUTA_DE_ANTICIPOS}?limite=5000`)).estado).toBe(400);
  });
});

describe('por liquidar con fecha de corte', () => {
  it('antes del gasto: lo que estaba abierto, aunque hoy esté anulado, sin lo gastado después', async () => {
    const pagina = await lista(`?corte=${haceDias(25)}`);

    expect(numerosDe(pagina).sort()).toEqual([primero.numero, anulado.numero].sort());
    expect(pagina.totalPorJustificar).toBe('1200.00');
    const delPrimero = pagina.elementos.find((fila: { numero: string }) => fila.numero === primero.numero);
    expect(delPrimero).toMatchObject({
      porJustificar: '1000.00',
      gastado: '0.00',
      vencido: false,
      diasDesdeLaEntrega: 5,
    });
  });

  it('después del gasto y del plazo: lo gastado resta y el anticipo ya estaba vencido; el anulado antes del corte no sale', async () => {
    const pagina = await lista(`?corte=${haceDias(8)}`);

    expect(numerosDe(pagina)).toEqual([primero.numero]);
    expect(pagina.elementos[0]).toMatchObject({
      porJustificar: '700.00',
      gastado: '300.00',
      vencido: true,
      diasVencido: 2,
      diasDesdeLaEntrega: 22,
    });
    expect(pagina.totalPorJustificar).toBe('700.00');
  });

  it('con corte y solo vencidos', async () => {
    expect(numerosDe(await lista(`?corte=${haceDias(8)}&vencidos=true`))).toEqual([primero.numero]);
    expect(numerosDe(await lista(`?corte=${haceDias(25)}&vencidos=true`))).toEqual([]);
  });
});

describe('la ficha', () => {
  it('trae el anticipo con su cheque, lo gastado y lo que se puede hacer', async () => {
    const ficha = (await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${primero.id}`)).cuerpo;

    expect(ficha).toMatchObject({
      id: primero.id,
      estado: 'abierto',
      gastado: '300.00',
      porJustificar: '700.00',
      puedeAnular: false,
      puedeLiquidar: true,
      descripcion: 'Viaje a la finca',
      liquidacion: null,
    });
    expect(ficha.movimiento).toMatchObject({ cuentaBancariaId: e.cuentaBancariaId });
    expect(ficha.movimiento.numero).toBeGreaterThan(0);
  });

  it('un anticipo de otra empresa no existe (404 por RLS, no 403)', async () => {
    const otra = await EscenarioDeAnticipos.preparar(entorno, 'cxlotraempresa');
    const ajeno = await otra.entregar(otra.conCheque(await otra.tercero('Luis', 'Ajeno'), '10.00'));

    expect((await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${ajeno.id}`)).estado).toBe(404);
    expect((await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${crypto.randomUUID()}`)).estado).toBe(404);
    expect(numerosDe(await lista('?estado=todos'))).toHaveLength(3);
  });
});

describe('los permisos', () => {
  it('ver la lista y la ficha exige anticipos.ver', async () => {
    expect((await soloVer.get(RUTA_DE_ANTICIPOS)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_DE_ANTICIPOS}/${primero.id}`)).estado).toBe(200);
    expect((await sinPermisos.get(RUTA_DE_ANTICIPOS)).estado).toBe(403);
    expect((await sinPermisos.get(`${RUTA_DE_ANTICIPOS}/${primero.id}`)).estado).toBe(403);
  });
});
