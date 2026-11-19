import { createHash } from 'node:crypto';
import type { TotalesDelCierre } from '../../../dominio/depreciacion/cierre-del-mes.js';
import type { Hallazgo } from '../../../dominio/depreciacion/hallazgos-del-cierre.js';

export interface LoRevisado {
  periodo: string;
  hallazgos: readonly Hallazgo[];
  totales: TotalesDelCierre;
  regimenIsr: string | null;
  /** Cuántas cuotas saldrían. */
  cuotas: number;
}

/**
 * sha256 de lo que vio quien revisa: los hallazgos y las cifras del mes. Lo que se guarda al cerrar se calcula otra
 * vez dentro del candado; si la huella ya no coincide, algo cambió y se pide revisar de nuevo.
 */
export function huellaDelCierre(revisado: LoRevisado): string {
  const { periodo, hallazgos, totales, regimenIsr, cuotas } = revisado;
  const texto = JSON.stringify({ periodo, hallazgos, totales, regimenIsr, cuotas });
  return createHash('sha256').update(texto).digest('hex');
}
