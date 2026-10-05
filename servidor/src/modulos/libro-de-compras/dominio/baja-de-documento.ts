import { AVISO_DE_PERIODO_PASADO, primerDiaDelMes } from './periodo-del-libro.js';
import {
  CausaDeAnulacionInvalida,
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesadoEnElDestino,
  DocumentoYaAnulado,
  MotivoDeAnulacionInvalido,
} from './errores-de-baja.js';

const MAXIMO_DEL_MOTIVO = 300;

/** Por qué se anula el registro (no la FEL: solo su emisor la anula en la SAT). */
export const CAUSAS_DE_ANULACION = [
  'error_de_captura',
  'fel_anulada_por_el_emisor',
  'no_corresponde_a_la_empresa',
] as const;
export type CausaDeAnulacion = (typeof CAUSAS_DE_ANULACION)[number];

/** Lo que se sabe de un documento para decidir si se anula o se elimina. */
export interface HechosDeUnDocumento {
  anulado: boolean;
  /** El destino ya lo procesó (`procesado_en_destino_en` lleno). */
  procesadoEnElDestino: boolean;
  /** Notas de crédito que lo rebajan y siguen vigentes. */
  notasVigentes: number;
  /** Todas las notas que lo rebajan, también las anuladas (la llave foránea las cuenta). */
  notasEnTotal: number;
}

/** Lo que la pantalla puede ofrecer de un documento. */
export interface AccionesDeDocumento {
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

/** Se anula lo vigente que no tenga notas de crédito vigentes. */
export function sePuedeAnular(hechos: HechosDeUnDocumento): boolean {
  return !hechos.anulado && hechos.notasVigentes === 0;
}

/**
 * «Limpio» es lo que se puede eliminar de verdad: vigente, sin procesar en el destino y sin notas de crédito
 * (ni siquiera anuladas). Lo anulado se queda como rastro fiscal.
 */
export function sePuedeEliminar(hechos: HechosDeUnDocumento): boolean {
  return !hechos.anulado && !hechos.procesadoEnElDestino && hechos.notasEnTotal === 0;
}

export function accionesDeDocumento(hechos: HechosDeUnDocumento): AccionesDeDocumento {
  return { puedeAnular: sePuedeAnular(hechos), puedeEliminar: sePuedeEliminar(hechos) };
}

/** @throws DocumentoYaAnulado o DocumentoConNotasVigentes si no se puede anular. */
export function exigirAnulable(hechos: HechosDeUnDocumento): void {
  if (hechos.anulado) throw new DocumentoYaAnulado();
  if (hechos.notasVigentes > 0) throw new DocumentoConNotasVigentes();
}

/** @throws DocumentoYaAnulado, DocumentoProcesadoEnElDestino o DocumentoConNotas si no se puede eliminar. */
export function exigirEliminable(hechos: HechosDeUnDocumento): void {
  if (hechos.anulado) throw new DocumentoYaAnulado();
  if (hechos.procesadoEnElDestino) throw new DocumentoProcesadoEnElDestino();
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
 * Aviso de anular o eliminar un documento de un período anterior al mes actual: puede estar declarado y habrá que
 * rectificar. `hoy` lo da quien llama (el dominio no lee el reloj).
 */
export function avisosDeBajaPorPeriodo(periodo: string, hoy: string): string[] {
  return periodo < primerDiaDelMes(hoy) ? [AVISO_DE_PERIODO_PASADO] : [];
}
