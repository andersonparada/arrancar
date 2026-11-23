/**
 * Saldos iniciales de inventario (INV-7): cada bodeguero solo ve y toca los renglones de su bodega, otra cuenta no ve
 * nada y la base guarda sus propias reglas (un documento vigente por bodega, la capa nunca posterior al movimiento).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, crearBodega, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import {
  cargarSaldoInicial,
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const PERMISOS = [
  'inventarios.saldos-iniciales.ver',
  'inventarios.saldos-iniciales.crear',
  'inventarios.saldos-iniciales.editar',
  'inventarios.saldos-iniciales.eliminar',
];
let e: EscenarioDeKardex;
let ajena: EscenarioDeKardex;
let bodega2: string;
let articulo: string;
let bodeguero1: ClienteApi;
let saldoDeBodega1: string;
let saldoDeBodega2: string;

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldosaislados', { metodo: 'promedio_ponderado' });
  ajena = await prepararSaldos(entorno, 'saldosajenos', { metodo: 'promedio_ponderado' });
  const propietario = e.cuenta.propietario;
  bodega2 = await crearBodega(propietario);
  articulo = await crearArticulo(propietario, e.referencias);
  bodeguero1 = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Bodeguero',
    apellidos: 'Saldos',
    permisos: PERMISOS,
  });
  const asignado = await propietario.put(`/api/inventarios/bodegas/accesos/${await idDe(bodeguero1)}`, {
    bodegaIds: [e.bodegaId],
  });
  expect(asignado.estado).toBe(200);
  saldoDeBodega1 = (
    await cargarSaldoInicial(
      propietario,
      datosDeSaldoInicial({ articuloId: articulo, bodegaId: e.bodegaId }, '10', '20.00'),
    )
  ).id;
  saldoDeBodega2 = (
    await cargarSaldoInicial(
      propietario,
      datosDeSaldoInicial({ articuloId: articulo, bodegaId: bodega2 }, '7', '14.00'),
    )
  ).id;
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('alcance por bodega', () => {
  it('el bodeguero ve solo los renglones de su bodega, y el propietario los de las dos', async () => {
    const suyos = (await bodeguero1.get(SALDOS_DE_INVENTARIO)).cuerpo;
    const todos = (await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo;

    expect(suyos.saldos.map((s: { id: string }) => s.id)).toEqual([saldoDeBodega1]);
    expect(suyos.totales).toMatchObject({ renglones: 1, valor: '20.00' });
    expect(todos.saldos).toHaveLength(2);
  });

  it('no carga, corrige ni elimina en la bodega ajena: para él no existe', async () => {
    const datos = datosDeSaldoInicial({ articuloId: articulo, bodegaId: bodega2 }, '1', '1.00');

    const nuevo = await bodeguero1.post(SALDOS_DE_INVENTARIO, datos);
    const corregido = await bodeguero1.put(`${SALDOS_DE_INVENTARIO}/${saldoDeBodega2}`, datos);
    const borrado = await bodeguero1.delete(`${SALDOS_DE_INVENTARIO}/${saldoDeBodega2}`);

    expect([nuevo.estado, corregido.estado, borrado.estado]).toEqual([404, 404, 404]);
    expect((await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo.totales.valor).toBe('34.00');
  });

  it('en su bodega sí carga y corrige, y el documento de la bodega sigue siendo uno', async () => {
    const nuevo = await bodeguero1.post(
      SALDOS_DE_INVENTARIO,
      datosDeSaldoInicial({ articuloId: articulo, bodegaId: e.bodegaId }, '3', '6.00'),
    );
    const corregido = await bodeguero1.put(
      `${SALDOS_DE_INVENTARIO}/${saldoDeBodega1}`,
      datosDeSaldoInicial({ articuloId: articulo, bodegaId: e.bodegaId }, '10', '25.00'),
    );

    expect([nuevo.estado, corregido.estado]).toEqual([201, 200]);
    const documentos = await comoPropietario<{ n: string }>(
      `select count(*)::text as n from inventarios.documentos where bodega_id = $1 and clase = 'saldo_inicial' and estado = 'vigente'`,
      [e.bodegaId],
    );
    expect(documentos).toEqual([{ n: '1' }]);
  });

  it('otra cuenta no ve los renglones ni puede tocarlos', async () => {
    const lista = (await ajena.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo;
    const borrado = await ajena.cuenta.propietario.delete(`${SALDOS_DE_INVENTARIO}/${saldoDeBodega1}`);

    expect(lista.saldos).toEqual([]);
    expect(borrado.estado).toBe(404);
  });
});

describe('reglas de la base de datos', () => {
  it('un segundo documento de saldo inicial vigente en la misma bodega se rechaza', async () => {
    await expect(
      comoPropietario(
        `insert into inventarios.documentos (empresa_id, clase, numero, fecha, bodega_id, estado)
         values ($1, 'saldo_inicial', 99, '2026-08-31', $2, 'vigente')`,
        [e.cuenta.empresaId, e.bodegaId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('la fecha de la capa no puede ser posterior a la del movimiento', async () => {
    await expect(
      comoPropietario(`update inventarios.movimientos set fecha_de_capa = fecha + 1 where id = $1`, [saldoDeBodega1]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('la función que reubica los saldos solo mueve los de la empresa de la transacción', async () => {
    const antes = await comoPropietario<{ fecha: string }>(
      `select fecha::text from inventarios.documentos where empresa_id = $1 and clase = 'saldo_inicial'`,
      [ajena.cuenta.empresaId],
    );

    await ajena.cuenta.propietario.put(`/api/empresas/${ajena.cuenta.empresaId}/carga-inicial`, {
      fechaDeInicio: '2026-09-02',
    });

    expect(antes).toEqual([]);
    const otra = await comoPropietario<{ fecha: string }>(
      `select distinct fecha::text from inventarios.documentos where empresa_id = $1 and clase = 'saldo_inicial'`,
      [e.cuenta.empresaId],
    );
    expect(otra).toEqual([{ fecha: '2026-08-31' }]);
  });
});
