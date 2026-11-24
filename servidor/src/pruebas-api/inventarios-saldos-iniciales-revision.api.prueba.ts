/**
 * Saldos iniciales de inventario (INV-7), correcciones de la revisión: renglones repetidos, quitar y agregar a la vez en
 * una bodega, la fecha de inicio con renglones ya corregidos y sus capas de PEPS, y el dinero solo con `costos.ver`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, crearBodega, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import { fijarFechaDeInicio } from './soporte/escenario-de-saldos-de-activos.js';
import {
  cargarSaldoInicial,
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;

const saldoDe = (articuloId: string, bodegaId: string, importes: [string, string] = ['10', '20.00']) =>
  datosDeSaldoInicial({ articuloId, bodegaId }, ...importes);
const lista = async (cliente: ClienteApi = e.cuenta.propietario) => (await cliente.get(SALDOS_DE_INVENTARIO)).cuerpo;

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldosrevision', { metodo: 'peps' });
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('un renglón por artículo, bodega, lote y fecha de la capa', () => {
  it('repetirlo se rechaza, y con otra fecha de capa o después de corregirlo sí se puede', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    const primero = await cargarSaldoInicial(e.cuenta.propietario, saldoDe(articulo, e.bodegaId));

    const repetido = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, saldoDe(articulo, e.bodegaId));
    const otraCapa = { ...saldoDe(articulo, e.bodegaId), fechaDeCapa: '2026-08-01' };
    const conOtraCapa = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, otraCapa);
    const choca = await e.cuenta.propietario.put(`${SALDOS_DE_INVENTARIO}/${conOtraCapa.cuerpo.id}`, {
      ...otraCapa,
      fechaDeCapa: null,
    });
    const mismoSitio = await e.cuenta.propietario.put(
      `${SALDOS_DE_INVENTARIO}/${primero.id}`,
      saldoDe(articulo, e.bodegaId, ['12', '30.00']),
    );

    expect(repetido.estado).toBe(422);
    expect(repetido.cuerpo.error.codigo).toBe('saldo_inicial_repetido');
    expect(conOtraCapa.estado).toBe(201);
    expect(choca.cuerpo.error?.codigo).toBe('saldo_inicial_repetido');
    expect(mismoSitio.estado, JSON.stringify(mismoSitio.cuerpo)).toBe(200);
    expect((await lista()).totales).toMatchObject({ renglones: 2, articulos: 1, valor: '50.00' });
  });
});

describe('quitar el último renglón y agregar otro a la vez en la misma bodega', () => {
  it('nunca deja renglones vigentes en un documento anulado', async () => {
    const bodegas = await Promise.all(Array.from({ length: 4 }, () => crearBodega(e.cuenta.propietario)));
    const pares = await Promise.all(
      bodegas.map(async (bodegaId) => ({
        bodegaId,
        viejo: await crearArticulo(e.cuenta.propietario, e.referencias),
        nuevo: await crearArticulo(e.cuenta.propietario, e.referencias),
      })),
    );
    const cargados = await Promise.all(
      pares.map((par) => cargarSaldoInicial(e.cuenta.propietario, saldoDe(par.viejo, par.bodegaId))),
    );

    const respuestas = await Promise.all(
      pares.flatMap((par, i) => [
        e.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${cargados[i].id}`),
        e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, saldoDe(par.nuevo, par.bodegaId)),
      ]),
    );

    expect(respuestas.map((r) => r.estado).sort()).toEqual([...Array(4).fill(201), ...Array(4).fill(204)]);
    const huerfanos = await comoPropietario<{ id: string }>(
      `select m.id from inventarios.movimientos m join inventarios.documentos d on d.id = m.documento_id
        where m.empresa_id = $1 and m.vigente and d.estado = 'anulado'`,
      [e.cuenta.empresaId],
    );
    expect(huerfanos).toEqual([]);
    const enLista = ((await lista()).saldos as { bodegaId: string }[]).filter((s) => bodegas.includes(s.bodegaId));
    expect(enLista).toHaveLength(4);
  });
});

describe('cambiar la fecha de inicio con renglones ya corregidos', () => {
  it('un renglón corregido ya no estorba, y las capas de PEPS siguen a su movimiento', async () => {
    const otraBodega = await crearBodega(e.cuenta.propietario);
    const [a, b] = [
      await crearArticulo(e.cuenta.propietario, e.referencias),
      await crearArticulo(e.cuenta.propietario, e.referencias),
    ];
    await cargarSaldoInicial(e.cuenta.propietario, saldoDe(a, otraBodega));
    const propio = await cargarSaldoInicial(e.cuenta.propietario, {
      ...saldoDe(b, otraBodega),
      fechaDeCapa: '2026-08-20',
    });
    await e.cuenta.propietario.put(`${SALDOS_DE_INVENTARIO}/${propio.id}`, {
      ...saldoDe(b, otraBodega),
      fechaDeCapa: '2026-08-01',
    });
    const tienenCapa = (articulo: string) =>
      comoPropietario<{ fecha: string }>(
        `select fecha::text from inventarios.capas where articulo_id = $1 and vigente`,
        [articulo],
      );

    const cambio = await fijarFechaDeInicio(e.cuenta, '2026-08-10');

    expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(200);
    expect(await tienenCapa(a)).toEqual([{ fecha: '2026-08-09' }]);
    expect(await tienenCapa(b)).toEqual([{ fecha: '2026-08-01' }]);
  });
});

describe('el dinero solo con inventarios.costos.ver', () => {
  let sinCostos: ClienteApi;
  let conCostos: ClienteApi;

  beforeAll(async () => {
    const permisos = [
      'inventarios.saldos-iniciales.ver',
      'inventarios.saldos-iniciales.crear',
      'inventarios.saldos-iniciales.editar',
    ];
    sinCostos = await crearUsuarioConPermisos(entorno, e.cuenta, { nombres: 'Sin', apellidos: 'Costos', permisos });
    conCostos = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Con',
      apellidos: 'Costos',
      permisos: [...permisos, 'inventarios.costos.ver'],
    });
    for (const usuario of [sinCostos, conCostos]) {
      const id = (await usuario.get('/api/sesion')).cuerpo.usuario.id as string;
      const asignado = await e.cuenta.propietario.put(`/api/inventarios/bodegas/accesos/${id}`, {
        bodegaIds: [e.bodegaId],
      });
      expect(asignado.estado).toBe(200);
    }
  });

  it('la lista, el alta y la corrección no llevan costos ni valor sin el permiso', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    const alta = await sinCostos.post(SALDOS_DE_INVENTARIO, saldoDe(articulo, e.bodegaId, ['4', '8.00']));
    const correccion = await sinCostos.put(
      `${SALDOS_DE_INVENTARIO}/${alta.cuerpo.id}`,
      saldoDe(articulo, e.bodegaId, ['5', '9.00']),
    );
    const pantalla = await lista(sinCostos);

    expect(alta.estado, JSON.stringify(alta.cuerpo)).toBe(201);
    for (const saldo of [alta.cuerpo, correccion.cuerpo, ...pantalla.saldos]) {
      expect(saldo).toMatchObject({ costoTotal: null, costoUnitario: null });
    }
    expect(correccion.cuerpo.cantidad).toBe('5.0000');
    expect(pantalla.totales).toMatchObject({ valor: null });
    expect(pantalla.totales.renglones).toBeGreaterThan(0);
  });

  it('con el permiso ve todo, y lo guardado es lo que se escribió', async () => {
    const pantalla = await lista(conCostos);

    expect(pantalla.totales.valor).toMatch(/^\d+\.\d{2}$/);
    expect(pantalla.saldos.every((s: { costoTotal: string | null }) => s.costoTotal !== null)).toBe(true);
    expect(pantalla.saldos.map((s: { costoTotal: string }) => s.costoTotal)).toContain('9.00');
  });
});
