import type { CausaDeAnulacionDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import {
  CausaDeAnulacionInvalida,
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesado,
  DocumentoYaAnulado,
  FechaDeAnulacionInvalida,
  FechaDeAnulacionRequerida,
  MotivoDeAnulacionInvalido,
  NotaDeDebitoSostieneNotasDeCredito,
} from './errores-de-baja.js';
import type { FacturaConNotas } from './reglas-de-notas.js';
import { medirElTopeDeNotasDeCredito } from './tope-de-notas.js';

const MAXIMO_DEL_MOTIVO = 300;

/** Por qué se anula un documento de venta. */
export const CAUSAS_DE_ANULACION = [
  'fel_anulada_en_la_sat',
  'error_de_captura',
  'no_corresponde_a_la_empresa',
] as const satisfies readonly CausaDeAnulacionDeVenta[];
export type CausaDeAnulacion = (typeof CAUSAS_DE_ANULACION)[number];

/** La causa como se lee en pantalla y en los informes. */
export const TEXTO_DE_CAUSA_DE_ANULACION: Record<CausaDeAnulacion, string> = {
  fel_anulada_en_la_sat: 'La FEL se anuló en la SAT',
  error_de_captura: 'Error de captura',
  no_corresponde_a_la_empresa: 'No es una venta de esta empresa',
};

/** Lo que se sabe de un documento para decidir si se anula o se elimina. */
export interface HechosDeUnDocumento {
  anulado: boolean;
  /** La cartera ya lo procesó (`procesado_en_destino_en` lleno). */
  procesadoEnElDestino: boolean;
  /** Notas que lo corrigen y siguen vigentes. */
  notasVigentes: number;
  /** Todas las notas que lo corrigen, también las anuladas (la llave foránea las cuenta). */
  notasEnTotal: number;
}

/** Lo que la pantalla puede ofrecer de un documento. */
export interface AccionesDeDocumento {
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

/** Se anula lo vigente que no tenga notas vigentes. */
export const sePuedeAnular = (hechos: HechosDeUnDocumento): boolean => !hechos.anulado && hechos.notasVigentes === 0;

/** «Limpio» es lo que se puede eliminar de verdad: vigente, sin procesar en el destino y sin notas (ni anuladas). */
export const sePuedeEliminar = (hechos: HechosDeUnDocumento): boolean =>
  !hechos.anulado && !hechos.procesadoEnElDestino && hechos.notasEnTotal === 0;

export const accionesDeDocumento = (hechos: HechosDeUnDocumento): AccionesDeDocumento => ({
  puedeAnular: sePuedeAnular(hechos),
  puedeEliminar: sePuedeEliminar(hechos),
});

/** @throws DocumentoYaAnulado o DocumentoConNotasVigentes. */
export function exigirAnulable(hechos: HechosDeUnDocumento): void {
  if (hechos.anulado) throw new DocumentoYaAnulado();
  if (hechos.notasVigentes > 0) throw new DocumentoConNotasVigentes();
}

/** @throws DocumentoYaAnulado, DocumentoProcesado o DocumentoConNotas. */
export function exigirEliminable(hechos: HechosDeUnDocumento): void {
  if (hechos.anulado) throw new DocumentoYaAnulado();
  if (hechos.procesadoEnElDestino) throw new DocumentoProcesado();
  if (hechos.notasEnTotal > 0) throw new DocumentoConNotas();
}

/** El motivo sin espacios sobrantes: de 1 a 300 caracteres. */
export function motivoDeAnulacionValido(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
  return limpio;
}

/** @throws CausaDeAnulacionInvalida si no es una de `CAUSAS_DE_ANULACION`. */
export function causaDeAnulacionValida(causa: string): CausaDeAnulacion {
  const conocida = CAUSAS_DE_ANULACION.find((posible) => posible === causa);
  if (!conocida) throw new CausaDeAnulacionInvalida();
  return conocida;
}

/**
 * La fecha de anulación. Con la causa `fel_anulada_en_la_sat` es la fecha real en que la SAT anuló el DTE: se exige y
 * nunca se presume. Con las otras causas no hay acto de la SAT: es la del registro interno (hoy). No va antes de la
 * emisión ni después de hoy. No cambia el período fiscal: el DTE anulado sale del débito del mes de su emisión.
 * @throws FechaDeAnulacionRequerida o FechaDeAnulacionInvalida
 */
export function fechaDeAnulacionValida(
  anulacion: { causa: CausaDeAnulacion; fecha: string | null },
  contexto: { emision: string; hoy: string },
): string {
  if (anulacion.causa !== 'fel_anulada_en_la_sat') return contexto.hoy;
  if (anulacion.fecha === null) throw new FechaDeAnulacionRequerida();
  if (anulacion.fecha < contexto.emision || anulacion.fecha > contexto.hoy) throw new FechaDeAnulacionInvalida();
  return anulacion.fecha;
}

/**
 * Anular una nota de débito: las notas de crédito vigentes deben seguir cabiendo sin ella, es decir en la factura más
 * las demás notas de débito, en total y en IVA (la misma regla de tope que al registrar una nota).
 * @throws NotaDeDebitoSostieneNotasDeCredito
 */
export function exigirQueLasNotasDeCreditoSigaCabiendo(
  factura: FacturaConNotas,
  notaDeDebitoQueSeQuita: { total: number; iva: number },
): void {
  const tope = {
    total: factura.total + factura.totalDeNotasDeDebito - notaDeDebitoQueSeQuita.total,
    iva: factura.iva + factura.ivaDeNotasDeDebito - notaDeDebitoQueSeQuita.iva,
  };
  const acumulado = {
    total: factura.totalDeNotasDeCredito,
    iva: factura.ivaDeNotasDeCredito,
    notasDeCredito: factura.cantidadDeNotasDeCredito,
  };
  if (!medirElTopeDeNotasDeCredito(tope, acumulado).cabe) throw new NotaDeDebitoSostieneNotasDeCredito();
}
