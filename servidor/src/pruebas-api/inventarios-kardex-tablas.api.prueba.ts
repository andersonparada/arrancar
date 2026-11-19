import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { entrada, prepararKardex, salida, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let movimientoDeEntrada: string;
let documentoDeEntrada: string;
let documentoDeSalida: string;

/** La base rechaza el cambio por la restricción indicada, aunque se escriba sin pasar por el dominio. */
const rechaza = (sql: string, parametros: unknown[], restriccion: string | RegExp) =>
  expect(comoPropietario(sql, parametros)).rejects.toThrow(restriccion);

const metodo = (desde: string, autorizacion: [string | null, string | null] = [null, null]) =>
  comoPropietario(
    `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde, autorizacion_sat_numero, autorizacion_sat_fecha)
     values ($1, 'peps', $2, $3, $4)`,
    [e.cuenta.empresaId, desde, ...autorizacion],
  );

beforeAll(async () => {
  e = await prepararKardex(entorno, 'kardextablas');
  const compra = await entrada(e.cuenta.propietario, {
    bodegaId: e.bodegaId,
    fecha: '2026-01-10',
    renglones: [{ articuloId: e.articuloId, cantidad: '10', costoTotal: '20.00' }],
  });
  const consumo = await salida(e.cuenta.propietario, e, {
    bodegaId: e.bodegaId,
    fecha: '2026-01-11',
    renglones: [{ articuloId: e.articuloId, cantidad: '4' }],
  });
  documentoDeEntrada = compra.cuerpo.id;
  documentoDeSalida = consumo.cuerpo.id;
  movimientoDeEntrada = compra.cuerpo.renglones[0].movimientoId;
});

describe('métodos de costeo', () => {
  it('un cambio rige desde el 1 de enero del año siguiente a la autorización (V-1), calculado y con check', async () => {
    await metodo('2027-01-01', ['AUT-1', '2026-03-10']);

    await rechaza(
      `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde, autorizacion_sat_numero, autorizacion_sat_fecha)
       values ($1, 'peps', '2027-02-01', 'AUT-2', '2026-03-10')`,
      [e.cuenta.empresaId],
      'metodos_de_costeo_desde_de_la_autorizacion',
    );
    await rechaza(
      `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde, autorizacion_sat_numero, autorizacion_sat_fecha)
       values ($1, 'peps', '2026-04-01', 'AUT-3', '2026-03-10')`,
      [e.cuenta.empresaId],
      'metodos_de_costeo_desde_de_la_autorizacion',
    );
  });

  it('empieza en un primer día de mes, es único por fecha y la autorización va completa', async () => {
    await rechaza(
      `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde) values ($1, 'peps', '2028-03-15')`,
      [e.cuenta.empresaId],
      'metodos_de_costeo_primer_dia',
    );
    await rechaza(
      `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde, autorizacion_sat_numero)
       values ($1, 'peps', '2029-01-01', 'AUT-4')`,
      [e.cuenta.empresaId],
      'metodos_de_costeo_autorizacion_completa',
    );
    await rechaza(
      `insert into inventarios.metodos_de_costeo (empresa_id, metodo, desde) values ($1, 'peps', '2027-01-01')`,
      [e.cuenta.empresaId],
      'metodos_de_costeo_desde_unico',
    );
  });
});

describe('movimientos', () => {
  const cambiar = (columnas: string, restriccion: string) =>
    rechaza(`update inventarios.movimientos set ${columnas} where id = $1`, [movimientoDeEntrada], restriccion);

  it('la cantidad y el costo llevan el signo de su tipo', async () => {
    await cambiar('cantidad = -1', 'movimientos_cantidad_por_tipo');
    await cambiar("tipo = 'valor'", 'movimientos_cantidad_por_tipo');
    await cambiar('costo_total = -1', 'movimientos_costo_por_tipo');
    await cambiar('costo_unitario = -1', 'movimientos_costo_unitario');
    await cambiar('orden_del_dia = 3', 'movimientos_orden_del_dia');
  });

  it('los saldos nunca son negativos y sin cantidad no hay valor', async () => {
    await cambiar('saldo_cantidad = -1, saldo_valor = 0', 'movimientos_saldos_no_negativos');
    await cambiar('saldo_cantidad = 0, saldo_valor = 5', 'movimientos_saldo_sin_cantidad');
  });

  it('la unidad escrita va con su cantidad, solo un valor puede faltar de bodega y el orden de registro no se escribe', async () => {
    await cambiar('cantidad_escrita = null', 'movimientos_unidad_escrita_completa');
    await cambiar('bodega_id = null', 'movimientos_bodega_salvo_valor');
    await expect(
      comoPropietario(`update inventarios.movimientos set secuencia = 1 where id = $1`, [movimientoDeEntrada]),
    ).rejects.toThrow(/secuencia/);
  });
});

describe('documentos', () => {
  const cambiar = (id: string, columnas: string, restriccion: string | RegExp) =>
    rechaza(`update inventarios.documentos set ${columnas} where id = $1`, [id], restriccion);

  it('cada clase lleva sus datos: la entrada su causa y soporte, la salida su destino y concepto', async () => {
    await cambiar(documentoDeEntrada, 'causa = null', 'documentos_causa_segun_clase');
    await cambiar(documentoDeEntrada, 'soporte = null', 'documentos_soporte_de_entrada');
    await cambiar(documentoDeEntrada, "destino = 'gasto'", /documentos_(destino_segun_clase|concepto_segun_destino)/);
    await cambiar(documentoDeSalida, 'concepto_de_gasto_id = null', 'documentos_concepto_segun_destino');
    await cambiar(documentoDeSalida, "causa = 'aporte'", 'documentos_causa_segun_clase');
    await cambiar(documentoDeEntrada, "causa = 'robo'", 'documentos_causa_valida');
  });

  it('una anulación lleva sus tres datos y el número es único por clase', async () => {
    await cambiar(documentoDeEntrada, "estado = 'anulado'", 'documentos_anulacion_completa');
    await cambiar(documentoDeEntrada, 'numero = 0', 'documentos_numero_positivo');
    await rechaza(
      `insert into inventarios.documentos (empresa_id, clase, numero, fecha, bodega_id, causa, soporte)
       values ($1, 'entrada_manual', 1, '2026-01-12', $2, 'aporte', 'Acta')`,
      [e.cuenta.empresaId, e.bodegaId],
      'documentos_numero_unico',
    );
  });
});

describe('existencias, saldos y capas', () => {
  it('la cantidad no es negativa y la llave del lote sigue a su lote', async () => {
    await rechaza(
      `update inventarios.existencias set cantidad = -1 where articulo_id = $1`,
      [e.articuloId],
      'existencias_cantidad_no_negativa',
    );
    await rechaza(
      `update inventarios.existencias set lote_clave = gen_random_uuid() where articulo_id = $1`,
      [e.articuloId],
      'existencias_clave_del_lote',
    );
  });

  it('el saldo del artículo no tiene valor sin cantidad', async () => {
    await rechaza(
      `update inventarios.saldos_de_articulos set cantidad = 0, valor = 3 where articulo_id = $1`,
      [e.articuloId],
      'saldos_de_articulos_valor_sin_cantidad',
    );
  });

  it('el caché quedó como dice el kardex: 6 lb a Q12.00', async () => {
    const [saldo] = await comoPropietario<{ cantidad: string; valor: string; costo_promedio: string }>(
      `select cantidad::text, valor::text, costo_promedio::text from inventarios.saldos_de_articulos where articulo_id = $1`,
      [e.articuloId],
    );

    expect(saldo).toEqual({ cantidad: '6.0000', valor: '12.00', costo_promedio: '2.000000' });
  });
});
