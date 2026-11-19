import { expect } from 'vitest';
import type { EntornoApi } from './entorno-api.js';
import { claseDe } from './escenario-de-activos.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';

export const RUTA_BANDEJA = '/api/activos-fijos/bandeja';
export const RUTA_ACTIVOS = '/api/activos-fijos/activos';

/** Una cuenta con Libro de compras y Activos fijos, un concepto de activo fijo y el proveedor de siempre. */
export interface EscenarioDeBandeja extends EscenarioDeDocumentos {
  conceptoDeActivoId: string;
  claseVehiculosId: string;
  claseEdificiosId: string;
}

export async function prepararBandeja(entorno: EntornoApi, usuario: string): Promise<EscenarioDeBandeja> {
  const escenario = await prepararEscenario(entorno, usuario, ['terceros', 'libro-de-compras', 'activos-fijos']);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
  });
  const concepto = await escenario.cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Vehículos y maquinaria',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: true,
    activo: true,
  });
  expect(concepto.estado).toBe(201);
  return {
    ...escenario,
    conceptoDeActivoId: concepto.cuerpo.id,
    claseVehiculosId: await claseDe(escenario.cuenta, 'Vehículos'),
    claseEdificiosId: await claseDe(escenario.cuenta, 'Edificios'),
  };
}

/** Una línea del libro marcada como activo fijo; el total lleva IVA (Q1,120.00 son Q1,000.00 de costo). */
export const lineaDeActivo = (
  escenario: EscenarioDeBandeja,
  total = '1120.00',
  extra: Record<string, unknown> = {},
) => ({
  conceptoId: escenario.conceptoDeActivoId,
  total,
  esActivoFijo: true,
  descripcion: 'Tractor John Deere',
  ...extra,
});

/** Registra un documento y devuelve su id y los ids de sus líneas, en orden. */
export async function registrarDocumento(escenario: EscenarioDeBandeja, cambios: Record<string, unknown> = {}) {
  const respuesta = await escenario.cuenta.propietario.post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { lineas: [lineaDeActivo(escenario)], ...cambios }),
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
export const registrarNotaDeCredito = (escenario: EscenarioDeBandeja, facturaId: string, total: string) =>
  registrarDocumento(escenario, {
    tipo: 'nota_de_credito',
    serie: 'N',
    documentoAfectadoId: facturaId,
    lineas: [lineaDeActivo(escenario, total, { esActivoFijo: false })],
  });

/** El cuerpo de una asignación a un activo nuevo: la línea y el monto, y lo demás son datos del activo que nace. */
export const asignacionNueva = (
  escenario: EscenarioDeBandeja,
  { lineaId, monto, ...activoNuevo }: { lineaId: string; monto: string } & Record<string, unknown>,
) => ({
  lineaId,
  monto,
  activoNuevo: { descripcion: 'Tractor John Deere', claseId: escenario.claseVehiculosId, ...activoNuevo },
});

export const capitalizar = (escenario: EscenarioDeBandeja, asignaciones: unknown[]) =>
  escenario.cuenta.propietario.post(`${RUTA_BANDEJA}/capitalizar`, { asignaciones });

export const costosDeActivo = (escenario: EscenarioDeBandeja, activoId: string) =>
  escenario.cuenta.propietario.get(`${RUTA_ACTIVOS}/${activoId}/costos`);
