/**
 * Quién puede qué en el cierre mensual del inventario: permisos por acción, alcance total para cerrar y reabrir, la foto
 * por bodega para quien no las ve todas, costos solo con `costos.ver` y aislamiento entre cuentas.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  CIERRES,
  cerrarMes,
  fotoDelMes,
  reabrirMes,
  renglonesDeFoto,
  revisarMes,
} from './soporte/escenario-de-cierres.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  prepararKardex,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const PERMISOS_DE_CIERRE = ['inventarios.cierres.ver', 'inventarios.cierres.cerrar', 'inventarios.cierres.reabrir'];
let e: EscenarioDeKardex;
let ajena: EscenarioDeKardex;
let bodega1: string;
let bodega2: string;
let soloVe: ClienteApi;
let soloCierra: ClienteApi;
let bodeguero: ClienteApi;
let bodegueroConCostos: ClienteApi;

const propietario = () => e.cuenta.propietario;
const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

async function asignar(cliente: ClienteApi, bodegaId: string) {
  const respuesta = await propietario().put(`/api/inventarios/bodegas/accesos/${await idDe(cliente)}`, {
    bodegaIds: [bodegaId],
  });
  expect(respuesta.estado).toBe(200);
}

beforeAll(async () => {
  e = await prepararKardex(entorno, 'cierresperm');
  ajena = await prepararKardex(entorno, 'cierresotra');
  [bodega1, bodega2] = [e.bodegaId, await crearBodega(propietario())];
  const otroArticulo = await crearArticulo(propietario(), e.referencias);
  const compra = (bodegaId: string, renglon: { articuloId: string; cantidad: string; costoTotal: string }) =>
    entrada(propietario(), { bodegaId, fecha: '2026-07-02', renglones: [renglon] });
  await compra(bodega1, { articuloId: e.articuloId, cantidad: '100', costoTotal: '200.00' });
  await compra(bodega2, { articuloId: e.articuloId, cantidad: '50', costoTotal: '115.00' });
  await compra(bodega2, { articuloId: otroArticulo, cantidad: '10', costoTotal: '30.00' });
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Cierre', permisos });
  soloVe = await usuario('Ve', ['inventarios.cierres.ver', 'inventarios.existencias.ver']);
  soloCierra = await usuario('Cierra', ['inventarios.cierres.cerrar']);
  bodeguero = await usuario('Bodeguero', [...PERMISOS_DE_CIERRE, 'inventarios.existencias.ver']);
  bodegueroConCostos = await usuario('Costos', [
    ...PERMISOS_DE_CIERRE,
    'inventarios.existencias.ver',
    'inventarios.costos.ver',
  ]);
  await asignar(bodeguero, bodega1);
  await asignar(bodegueroConCostos, bodega1);
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('permisos por acción', () => {
  it('ver no deja cerrar ni reabrir; cerrar no deja ver; reabrir no deja cerrar', async () => {
    expect((await soloVe.get(CIERRES)).estado).toBe(200);
    expect((await cerrarMes(soloVe, '2026-07-01')).estado).toBe(403);
    expect((await reabrirMes(soloVe, '2026-07-01')).estado).toBe(403);
    expect((await soloCierra.get(CIERRES)).estado).toBe(403);
    expect((await fotoDelMes(soloCierra, '2026-07-01')).estado).toBe(403);
  });
});

describe('alcance total', () => {
  it('quien no ve todas las bodegas no revisa, cierra ni reabre, aunque tenga el permiso', async () => {
    const revision = await revisarMes(bodeguero, '2026-07-01');
    const cierre = await cerrarMes(bodeguero, '2026-07-01');
    const reapertura = await reabrirMes(bodeguero, '2026-07-01');

    expect([revision, cierre, reapertura].map((r) => r.cuerpo.error.codigo)).toEqual([
      'cierre_sin_alcance_total',
      'cierre_sin_alcance_total',
      'cierre_sin_alcance_total',
    ]);
    expect((await propietario().get(CIERRES)).cuerpo.cierres).toEqual([]);
  });
});

describe('la foto del mes cerrado', () => {
  beforeAll(async () => {
    expect((await cerrarMes(propietario(), '2026-07-01')).estado).toBe(200);
  });

  it('el propietario ve las dos bodegas; el bodeguero, solo la suya', async () => {
    const todas = await renglonesDeFoto(propietario(), '2026-07-01');
    const suya = await renglonesDeFoto(bodeguero, '2026-07-01');

    expect(new Set(todas.map((r) => r.bodegaId))).toEqual(new Set([bodega1, bodega2]));
    expect(suya.map((r) => r.bodegaId)).toEqual([bodega1]);
  });

  it('sin costos.ver, la foto lleva solo las cantidades', async () => {
    const sinCostos = await renglonesDeFoto(bodeguero, '2026-07-01');
    const conCostos = await renglonesDeFoto(bodegueroConCostos, '2026-07-01');

    expect(sinCostos[0]).toMatchObject({ cantidad: '100.0000', costoUnitario: null, valor: null });
    expect(conCostos[0]).toMatchObject({ cantidad: '100.0000', costoUnitario: '2.100000', valor: '210.00' });
  });

  it('un mes sin cerrar no tiene foto', async () => {
    expect((await fotoDelMes(propietario(), '2026-08-01')).estado).toBe(404);
  });
});

describe('aislamiento entre cuentas', () => {
  it('otra cuenta no ve los cierres de esta: su inventario empieza de cero', async () => {
    const lista = await ajena.cuenta.propietario.get(CIERRES);

    expect(lista.cuerpo).toEqual({ siguienteMes: null, cierres: [] });
    expect((await fotoDelMes(ajena.cuenta.propietario, '2026-07-01')).estado).toBe(404);
    expect((await cerrarMes(ajena.cuenta.propietario, '2026-07-01')).cuerpo.error.codigo).toBe('sin_mes_por_cerrar');
  });

  it('el periodo tiene que ser un primer día de mes', async () => {
    expect((await revisarMes(propietario(), '2026-07-15')).estado).toBe(400);
    expect((await revisarMes(propietario(), '2026-13-01')).estado).toBe(400);
  });
});
