import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/**
 * Qué le pasó al NIT de la empresa. Agregarlo por primera vez no es peligroso; quitarlo o reemplazarlo
 * puede apagar las salvaguardas de Ventas y caja o esconder un error, por eso pide permiso y motivo (A-10).
 */
export type CambioDeNit = 'ninguno' | 'agregado' | 'corregido';

export class FaltaElMotivoDelCambioDeNit extends DatoInvalido {
  readonly codigo = 'motivo_del_cambio_de_nit_requerido';

  constructor() {
    super('Escriba el motivo para quitar o cambiar el NIT de la empresa.');
  }
}

/** Compara los NIT ya normalizados (`1234567K`); `null` es una empresa sin NIT. */
export function clasificarCambioDeNit(antes: string | null, despues: string | null): CambioDeNit {
  if (antes === despues) return 'ninguno';
  return antes === null ? 'agregado' : 'corregido';
}

/** El motivo escrito, sin espacios sobrantes. @throws FaltaElMotivoDelCambioDeNit si no hay texto. */
export function motivoDelCambioDeNit(motivo: string | null | undefined): string {
  const limpio = motivo?.trim();
  if (!limpio) throw new FaltaElMotivoDelCambioDeNit();
  return limpio;
}
