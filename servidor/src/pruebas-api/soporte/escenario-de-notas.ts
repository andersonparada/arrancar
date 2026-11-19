import { expect } from 'vitest';
import { haceDias } from './escenario-de-documentos.js';
import { salida } from './escenario-de-kardex.js';
import {
  lineaDeInventario,
  recibir,
  registrarDocumento,
  registrarNotaDeCredito,
  renglonDeRecepcion,
  RUTA_DEVOLUCIONES,
  RUTA_REBAJAS,
  type EscenarioDeRecepciones,
} from './escenario-de-recepciones.js';

/** Una factura de `costo` quetzales (el total lleva el IVA) con una sola línea de inventario. */
export const factura = (escenario: EscenarioDeRecepciones, costo: number) =>
  registrarDocumento(escenario, { lineas: [lineaDeInventario(escenario, (costo * 1.12).toFixed(2))] });

/** Una nota de crédito de la factura por `costo` quetzales. */
export const nota = (escenario: EscenarioDeRecepciones, facturaId: string, costo: number) =>
  registrarNotaDeCredito(escenario, facturaId, (costo * 1.12).toFixed(2));

export interface Compra {
  /** Libras recibidas. */
  cantidad: string;
  /** Quetzales que costó la compra. */
  costo: number;
  /** Cuántos días atrás se recibió (10 por omisión). */
  dias?: number;
}

/** Registra una factura y recibe su línea completa; devuelve lo que las notas necesitan: factura, línea y entrada. */
export async function comprar(escenario: EscenarioDeRecepciones, articuloId: string, compra: Compra) {
  const { documentoId, lineaIds } = await factura(escenario, compra.costo);
  const renglon = renglonDeRecepcion(escenario, lineaIds[0]!, {
    cantidad: compra.cantidad,
    monto: compra.costo.toFixed(2),
    articuloId,
  });
  const respuesta = await recibir(escenario, [renglon], { fecha: haceDias(compra.dias ?? 10) });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  const documento = respuesta.cuerpo.documentos[0];
  return {
    documentoId,
    lineaId: lineaIds[0]!,
    recepcionId: documento.id,
    entradaId: documento.renglones[0].movimientoId,
  };
}

export interface Devolucion {
  lineaId: string;
  entradaId: string;
  cantidad: string;
  /** Cuántos días atrás se devuelve (5 por omisión). */
  dias?: number;
}

export const devolver = (escenario: EscenarioDeRecepciones, devolucion: Devolucion) =>
  escenario.cuenta.propietario.post(RUTA_DEVOLUCIONES, {
    fecha: haceDias(devolucion.dias ?? 5),
    lineaId: devolucion.lineaId,
    renglones: [{ movimientoDeEntradaId: devolucion.entradaId, cantidad: devolucion.cantidad }],
  });

export interface Rebaja {
  lineaId: string;
  monto: string;
  /** Cuántos días atrás se rebaja (3 por omisión). */
  dias?: number;
}

export const rebajar = (escenario: EscenarioDeRecepciones, rebaja: Rebaja) =>
  escenario.cuenta.propietario.post(RUTA_REBAJAS, {
    fecha: haceDias(rebaja.dias ?? 3),
    lineaId: rebaja.lineaId,
    monto: rebaja.monto,
    base: 'valor',
  });

/** Una salida a gasto de `cantidad` libras hace `dias` días. */
export const sacar = (
  escenario: EscenarioDeRecepciones,
  articuloId: string,
  salido: { cantidad: string; dias: number },
) =>
  salida(escenario.cuenta.propietario, escenario, {
    bodegaId: escenario.bodegaId,
    fecha: haceDias(salido.dias),
    renglones: [{ articuloId, cantidad: salido.cantidad }],
  });
