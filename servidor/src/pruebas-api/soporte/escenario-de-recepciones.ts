import { expect } from 'vitest';
import { crearReferencias, type ReferenciasDeArticulo } from '../inventarios.soporte.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';
import { crearArticulo, crearBodega } from './escenario-de-kardex.js';

export const RUTA_POR_RECIBIR = '/api/inventarios/por-recibir';
export const RUTA_RECEPCIONES = '/api/inventarios/recepciones';
export const RUTA_DEVOLUCIONES = '/api/inventarios/devoluciones-a-proveedor';
export const RUTA_REBAJAS = '/api/inventarios/rebajas-de-costo';

/** Una cuenta con Libro de compras e Inventarios: un concepto marcado como inventario, una bodega y un artículo. */
export interface EscenarioDeRecepciones extends EscenarioDeDocumentos {
  referencias: ReferenciasDeArticulo;
  conceptoDeInventarioId: string;
  bodegaId: string;
  articuloId: string;
}

export async function prepararRecepciones(entorno: EntornoApi, usuario: string): Promise<EscenarioDeRecepciones> {
  const escenario = await prepararEscenario(entorno, usuario, ['terceros', 'libro-de-compras', 'inventarios']);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
  });
  const { propietario } = escenario.cuenta;
  const concepto = await propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Alimento para ganado',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    esInventario: true,
    activo: true,
  });
  expect(concepto.estado, JSON.stringify(concepto.cuerpo)).toBe(201);
  const referencias = await crearReferencias(propietario);
  return {
    ...escenario,
    referencias,
    conceptoDeInventarioId: concepto.cuerpo.id,
    bodegaId: await crearBodega(propietario),
    articuloId: await crearArticulo(propietario, referencias),
  };
}

/** Una línea del libro marcada como inventario; el total lleva IVA (Q1,120.00 son Q1,000.00 de costo). */
export const lineaDeInventario = (
  escenario: EscenarioDeRecepciones,
  total = '1120.00',
  extra: Record<string, unknown> = {},
) => ({
  conceptoId: escenario.conceptoDeInventarioId,
  total,
  esInventario: true,
  descripcion: 'Concentrado',
  ...extra,
});

/** Registra un documento en el libro y devuelve su id y los ids de sus líneas, en orden. */
export async function registrarDocumento(escenario: EscenarioDeRecepciones, cambios: Record<string, unknown> = {}) {
  const respuesta = await escenario.cuenta.propietario.post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { lineas: [lineaDeInventario(escenario)], ...cambios }),
  );
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  const documentoId = respuesta.cuerpo.documento.id as string;
  const lineas = await consultar<{ id: string }>(
    'select id from libro_de_compras.lineas_de_documento where documento_id = $1 order by numero',
    [documentoId],
  );
  return { documentoId, lineaIds: lineas.map((linea) => linea.id) };
}

/** Una nota de crédito de la factura, con una sola línea sin marcar (entra a la bandeja por su factura). */
export const registrarNotaDeCredito = (escenario: EscenarioDeRecepciones, facturaId: string, total: string) =>
  registrarDocumento(escenario, {
    tipo: 'nota_de_credito',
    serie: 'N',
    documentoAfectadoId: facturaId,
    lineas: [lineaDeInventario(escenario, total, { esInventario: false })],
  });

/** Un renglón de recepción: cantidad en la unidad base y monto en quetzales como texto; el artículo se puede cambiar. */
export const renglonDeRecepcion = (
  escenario: EscenarioDeRecepciones,
  lineaId: string,
  datos: { cantidad: string; monto: string; articuloId?: string; loteNuevo?: Record<string, unknown> },
) => ({ lineaId, articuloId: escenario.articuloId, ...datos });

/** Recibe renglones en la bodega del escenario con la fecha de hoy, salvo que `cambios` diga otra. */
export const recibir = (
  escenario: EscenarioDeRecepciones,
  renglones: unknown[],
  cambios: Record<string, unknown> = {},
) =>
  escenario.cuenta.propietario.post(RUTA_RECEPCIONES, {
    fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
    bodegaId: escenario.bodegaId,
    renglones,
    ...cambios,
  });

export const porRecibir = async (escenario: EscenarioDeRecepciones, consulta = '') =>
  (await escenario.cuenta.propietario.get(`${RUTA_POR_RECIBIR}${consulta}`)).cuerpo.lineas as Array<
    Record<string, any>
  >;

export const marcaDeLaLinea = async (lineaId: string) =>
  (
    await consultar<{ es_inventario: boolean }>(
      'select es_inventario from libro_de_compras.lineas_de_documento where id = $1',
      [lineaId],
    )
  )[0]!.es_inventario;
