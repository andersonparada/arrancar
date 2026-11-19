/**
 * Lo que la base de datos garantiza de las tablas de INV-5 aunque se escriba sin pasar por el dominio: las reglas de los
 * documentos del libro, el reparto de costo, los descartes y el aislamiento por empresa.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  prepararRecepciones,
  recibir,
  registrarDocumento,
  registrarNotaDeCredito,
  renglonDeRecepcion,
  RUTA_REBAJAS,
  type EscenarioDeRecepciones,
} from './soporte/escenario-de-recepciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;
let recepcionId: string;
let entradaId: string;
let rebajaId: string;

/** La base rechaza el cambio por la restricción indicada. */
const rechaza = (sql: string, parametros: unknown[], restriccion: string) =>
  expect(comoPropietario(sql, parametros)).rejects.toThrow(restriccion);

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararRecepciones(entorno, 'recepcionestablas');
  const factura = await registrarDocumento(e);
  const recepcion = await recibir(e, [
    renglonDeRecepcion(e, factura.lineaIds[0]!, { cantidad: '100', monto: '1000.00' }),
  ]);
  recepcionId = recepcion.cuerpo.documentos[0].id;
  entradaId = recepcion.cuerpo.documentos[0].renglones[0].movimientoId;
  const nota = await registrarNotaDeCredito(e, factura.documentoId, '112.00');
  const rebaja = await e.cuenta.propietario.post(RUTA_REBAJAS, {
    fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
    lineaId: nota.lineaIds[0],
    monto: '50.00',
    base: 'valor',
  });
  rebajaId = rebaja.cuerpo.id;
});

afterAll(() => vi.restoreAllMocks());

describe('documentos del libro', () => {
  it('solo la rebaja de costo no tiene bodega, y las clases del libro llevan su documento de compra', async () => {
    await rechaza(
      'update inventarios.documentos set bodega_id = null where id = $1',
      [recepcionId],
      'documentos_bodega_segun_clase',
    );
    await rechaza(
      'update inventarios.documentos set bodega_id = (select id from inventarios.bodegas limit 1) where id = $1',
      [rebajaId],
      'documentos_bodega_segun_clase',
    );
    await rechaza(
      'update inventarios.documentos set documento_de_compra_id = null where id = $1',
      [recepcionId],
      'documentos_compra_segun_clase',
    );
  });

  it('no admite una clase que todavía no existe', async () => {
    await rechaza(
      "update inventarios.documentos set clase = 'ajuste' where id = $1",
      [recepcionId],
      'documentos_clase_valida',
    );
  });
});

describe('reparto de costo y descartes', () => {
  it('lo absorbido más lo que va a resultados es el monto, y la rebaja guarda su reparto con la entrada', async () => {
    const reparto = await comoPropietario<{ monto: string; movimiento_de_entrada_id: string }>(
      'select monto::text, movimiento_de_entrada_id from inventarios.repartos_de_costo where documento_id = $1',
      [rebajaId],
    );

    expect(reparto).toEqual([{ monto: '-50.00', movimiento_de_entrada_id: entradaId }]);
    await rechaza(
      'update inventarios.repartos_de_costo set absorbido = absorbido + 1 where documento_id = $1',
      [rebajaId],
      'repartos_de_costo_suma',
    );
    await rechaza(
      "update inventarios.repartos_de_costo set base_del_reparto = 'otra' where documento_id = $1",
      [rebajaId],
      'repartos_de_costo_base',
    );
  });

  it('una línea tiene a lo sumo un descarte vigente, con motivo, y se borra con su línea', async () => {
    const otra = await registrarDocumento(e);
    const nuevo = (motivo: string) =>
      comoPropietario(
        `insert into inventarios.descartes_de_lineas (empresa_id, documento_de_compra_id, linea_de_documento_id, motivo, quito_la_marca)
         values ($1, $2, $3, $4, false)`,
        [e.cuenta.empresaId, otra.documentoId, otra.lineaIds[0], motivo],
      );
    await nuevo('Primero');

    await rechaza(
      `insert into inventarios.descartes_de_lineas (empresa_id, documento_de_compra_id, linea_de_documento_id, motivo, quito_la_marca)
       values ($1, $2, $3, 'Segundo', false)`,
      [e.cuenta.empresaId, otra.documentoId, otra.lineaIds[0]],
      'descartes_de_lineas_vigente_unico',
    );
    await rechaza(
      `update inventarios.descartes_de_lineas set motivo = '  ' where linea_de_documento_id = $1`,
      [otra.lineaIds[0]],
      'descartes_de_lineas_motivo_largo',
    );
    await comoPropietario('delete from libro_de_compras.documentos where id = $1', [otra.documentoId]);
    const quedan = await comoPropietario(
      'select 1 from inventarios.descartes_de_lineas where documento_de_compra_id = $1',
      [otra.documentoId],
    );
    expect(quedan).toEqual([]);
  });

  it('la base no deja eliminar una factura con movimientos de Inventarios, aunque se salte el módulo', async () => {
    const factura = await registrarDocumento(e);
    await recibir(e, [renglonDeRecepcion(e, factura.lineaIds[0]!, { cantidad: '10', monto: '100.00' })]);

    await rechaza(
      'delete from libro_de_compras.documentos where id = $1',
      [factura.documentoId],
      'documentos_compra_fk',
    );
  });
});
