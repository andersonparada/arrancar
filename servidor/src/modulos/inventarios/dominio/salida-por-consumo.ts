import { DESTINOS_DE_SALIDA, type DestinoDeSalida } from './documento.js';
import { DestinoNoDisponible, DocumentoInvalido } from './errores-de-kardex.js';
import {
  exigirRenglones,
  textoOpcional,
  type EscritoComun,
  type PlanDeDocumento,
  type RenglonDePlan,
} from './plan-de-documento.js';

export interface SalidaEscrita extends EscritoComun {
  destino: DestinoDeSalida;
  /** Obligatorio en `gasto`; Contabilidad sacará la cuenta del concepto. */
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  /** Quien recibe lo que sale (firma de la boleta). */
  entregadoA: string | null;
}

/** Los destinos que ya se pueden usar: los de Activos fijos llegan con su integración (§4.3). */
const DESTINOS_DISPONIBLES: readonly DestinoDeSalida[] = ['gasto'];

function exigirDestino({ destino, conceptoDeGastoId }: SalidaEscrita): void {
  if (!DESTINOS_DE_SALIDA.includes(destino)) throw new DocumentoInvalido('El destino de la salida no es válido.');
  if (!DESTINOS_DISPONIBLES.includes(destino)) throw new DestinoNoDisponible();
  if (destino === 'gasto' && !conceptoDeGastoId) {
    throw new DocumentoInvalido('Elija el concepto de gasto: la salida a gasto lo necesita.');
  }
}

/** Las salidas no llevan costo escrito: lo calcula el método de costeo. */
const sinCosto = (renglon: RenglonDePlan): RenglonDePlan => ({ ...renglon, costoTotal: 0n });

/**
 * Revisa una salida por consumo (§3.7, §6.5): destino disponible y, a gasto, su concepto de gasto. Una salida lleva
 * un solo destino; si una requisición abarca varios, son varias salidas.
 * @throws DocumentoInvalido o DestinoNoDisponible si algo no se cumple.
 */
export function planDeSalida(datos: SalidaEscrita): PlanDeDocumento {
  exigirRenglones(datos.renglones);
  exigirDestino(datos);
  return {
    clase: 'salida_por_consumo',
    fecha: datos.fecha,
    bodegaId: datos.bodegaId,
    causa: null,
    destino: datos.destino,
    conceptoDeGastoId: datos.conceptoDeGastoId,
    localidadId: datos.localidadId,
    departamentoId: datos.departamentoId,
    activoFijoId: null,
    entregadoA: textoOpcional(datos.entregadoA, 'Entregado a', 150),
    soporte: null,
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
    renglones: datos.renglones.map(sinCosto),
    avisos: [],
  };
}
