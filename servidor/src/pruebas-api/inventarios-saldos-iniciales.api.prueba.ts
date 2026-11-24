/**
 * Saldos iniciales de inventario (INV-7): registrar con el documento por bodega, la fecha del día anterior al inicio, las
 * capas de PEPS con su fecha real, corregir, eliminar con su auditoría y el cuadre del kardex.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, crearBodega, salida, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import {
  cargarSaldoInicial,
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let otraBodega: string;

const lista = async () => (await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo;
const saldoDe = (articuloId: string, cantidad: string, costoTotal: string) =>
  datosDeSaldoInicial({ articuloId, bodegaId: e.bodegaId }, cantidad, costoTotal);

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldosinv');
  otraBodega = await crearBodega(e.cuenta.propietario);
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('antes del primer saldo', () => {
  it('pide elegir el método de costeo, y la lista dice que falta', async () => {
    const sinMetodo = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, saldoDe(e.articuloId, '10', '20.00'));
    const pantalla = await lista();

    expect(sinMetodo.estado).toBe(422);
    expect(sinMetodo.cuerpo.error.codigo).toBe('metodo_de_costeo_sin_elegir');
    expect(pantalla).toMatchObject({
      fechaDeInicio: '2026-09-01',
      fechaDelSaldo: '2026-08-31',
      cargaCerrada: false,
      metodo: { elegido: false },
      totales: { renglones: 0, articulos: 0, valor: '0.00' },
    });
    expect((await e.cuenta.propietario.post('/api/inventarios/metodo-de-costeo', { metodo: 'peps' })).estado).toBe(200);
  });
});

describe('registrar', () => {
  it('guarda el renglón en un documento saldo_inicial del día anterior al inicio y mueve el kardex', async () => {
    const saldo = await cargarSaldoInicial(e.cuenta.propietario, saldoDe(e.articuloId, '100', '200.00'));

    expect(saldo).toMatchObject({ cantidad: '100.0000', costoTotal: '200.00', fechaDeCapa: '2026-08-31' });
    const filas = await comoPropietario<{ clase: string; fecha: string; numero: number }>(
      `select clase, fecha::text, numero from inventarios.documentos where empresa_id = $1`,
      [e.cuenta.empresaId],
    );
    expect(filas).toEqual([{ clase: 'saldo_inicial', fecha: '2026-08-31', numero: 1 }]);
    const existencias = (await e.cuenta.propietario.get('/api/inventarios/existencias')).cuerpo;
    expect(existencias[0]).toMatchObject({ articuloId: e.articuloId, cantidad: '100.0000' });
  });

  it('los renglones de la misma bodega van al mismo documento y otra bodega abre otro', async () => {
    const otro = await crearArticulo(e.cuenta.propietario, e.referencias);
    await cargarSaldoInicial(e.cuenta.propietario, saldoDe(otro, '40', '90.00'));
    await cargarSaldoInicial(
      e.cuenta.propietario,
      datosDeSaldoInicial({ articuloId: otro, bodegaId: otraBodega }, '5', '10.00'),
    );

    const filas = await comoPropietario<{ bodega_id: string; renglones: string }>(
      `select d.bodega_id, count(m.id)::text as renglones from inventarios.documentos d
         join inventarios.movimientos m on m.documento_id = d.id
        where d.empresa_id = $1 and d.clase = 'saldo_inicial' and d.estado = 'vigente' group by d.bodega_id`,
      [e.cuenta.empresaId],
    );
    expect(filas.map((f) => [f.bodega_id === e.bodegaId, f.renglones]).sort()).toEqual([
      [false, '1'],
      [true, '2'],
    ]);
    expect((await lista()).totales).toMatchObject({ renglones: 3, articulos: 2, valor: '300.00' });
  });

  it('con PEPS la capa de compra más antigua sale primero, anotada antes o después', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await cargarSaldoInicial(e.cuenta.propietario, { ...saldoDe(articulo, '50', '115.00'), fechaDeCapa: '2026-08-01' });
    await cargarSaldoInicial(e.cuenta.propietario, {
      ...saldoDe(articulo, '100', '200.00'),
      fechaDeCapa: '2026-03-01',
    });

    const consumo = await salida(e.cuenta.propietario, e, {
      bodegaId: e.bodegaId,
      fecha: '2026-09-02',
      renglones: [{ articuloId: articulo, cantidad: '120' }],
    });

    expect(consumo.cuerpo.renglones[0].costoTotal).toBe('246.00');
    const capas = await comoPropietario<{ fecha: string; cantidad_restante: string }>(
      `select fecha::text, cantidad_restante::text from inventarios.capas where articulo_id = $1 order by fecha`,
      [articulo],
    );
    expect(capas).toEqual([
      { fecha: '2026-03-01', cantidad_restante: '0.0000' },
      { fecha: '2026-08-01', cantidad_restante: '30.0000' },
    ]);
  });

  it('rechaza una fecha de capa que no es anterior al inicio y la cantidad en cero', async () => {
    const capa = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, {
      ...saldoDe(e.articuloId, '1', '1.00'),
      fechaDeCapa: '2026-09-01',
    });
    const cero = await e.cuenta.propietario.post(SALDOS_DE_INVENTARIO, saldoDe(e.articuloId, '0', '1.00'));

    expect([capa.estado, cero.estado]).toEqual([400, 400]);
    expect(capa.cuerpo.error.codigo).toBe('documento_invalido');
  });
});

describe('corregir y eliminar', () => {
  it('corregir recalcula lo posterior y deja en la auditoría el renglón anterior', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    const saldo = await cargarSaldoInicial(e.cuenta.propietario, saldoDe(articulo, '100', '200.00'));
    await salida(e.cuenta.propietario, e, {
      bodegaId: e.bodegaId,
      fecha: '2026-09-02',
      renglones: [{ articuloId: articulo, cantidad: '10' }],
    });

    const corregido = await e.cuenta.propietario.put(
      `${SALDOS_DE_INVENTARIO}/${saldo.id}`,
      saldoDe(articulo, '100', '300.00'),
    );

    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect(corregido.cuerpo).toMatchObject({ costoTotal: '300.00' });
    const recalculos = await comoPropietario<{ causa: string; diferencia_de_costo: string }>(
      `select causa, diferencia_de_costo::text from inventarios.recalculos where articulo_id = $1`,
      [articulo],
    );
    expect(recalculos).toEqual([{ causa: 'saldo_inicial_corregido', diferencia_de_costo: '10.00' }]);
    const auditoria = await comoPropietario<{ anterior: { costoTotal: string } }>(
      `select anterior from core.auditoria where recurso = 'inventarios.saldos-iniciales' and accion = 'corregir' and registro_id = $1`,
      [saldo.id],
    );
    expect(auditoria[0]!.anterior.costoTotal).toBe('200.00');
  });

  it('no deja quitar ni achicar lo que una salida posterior ya consumió, y no cambia nada', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    const saldo = await cargarSaldoInicial(e.cuenta.propietario, saldoDe(articulo, '100', '200.00'));
    await salida(e.cuenta.propietario, e, {
      bodegaId: e.bodegaId,
      fecha: '2026-09-02',
      renglones: [{ articuloId: articulo, cantidad: '60' }],
    });

    const quitar = await e.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${saldo.id}`);
    const achicar = await e.cuenta.propietario.put(
      `${SALDOS_DE_INVENTARIO}/${saldo.id}`,
      saldoDe(articulo, '50', '100.00'),
    );

    expect([quitar.estado, achicar.estado]).toEqual([422, 422]);
    expect(quitar.cuerpo.error.codigo).toBe('existencia_negativa');
    expect((await lista()).saldos.find((s: { id: string }) => s.id === saldo.id)).toMatchObject({
      cantidad: '100.0000',
    });
  });

  it('eliminar quita el renglón y audita; con el último renglón del documento, este se anula', async () => {
    const bodega = await crearBodega(e.cuenta.propietario);
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    const saldo = await cargarSaldoInicial(
      e.cuenta.propietario,
      datosDeSaldoInicial({ articuloId: articulo, bodegaId: bodega }, '8', '16.00'),
    );

    const borrado = await e.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${saldo.id}`);
    const otraVez = await e.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${saldo.id}`);

    expect(borrado.estado).toBe(204);
    expect(otraVez.estado).toBe(404);
    const documento = await comoPropietario<{ estado: string }>(
      `select estado from inventarios.documentos where empresa_id = $1 and bodega_id = $2`,
      [e.cuenta.empresaId, bodega],
    );
    expect(documento).toEqual([{ estado: 'anulado' }]);
    const acciones = await comoPropietario<{ accion: string }>(
      `select accion from core.auditoria where recurso = 'inventarios.saldos-iniciales' and accion in ('eliminar', 'anular') and empresa_id = $1`,
      [e.cuenta.empresaId],
    );
    expect(acciones.map((a) => a.accion).sort()).toEqual(['anular', 'eliminar']);
  });
});
