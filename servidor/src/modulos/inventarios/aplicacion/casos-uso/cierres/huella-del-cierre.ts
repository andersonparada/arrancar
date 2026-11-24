import { createHash } from 'node:crypto';
import type { RenglonDelCierre, TotalesDelCierre } from '../../../dominio/cierre/existencias-del-cierre.js';
import type { Hallazgo } from '../../../dominio/cierre/hallazgos-del-cierre.js';

export interface LoRevisado {
  periodo: string;
  hallazgos: readonly Hallazgo[];
  totales: TotalesDelCierre;
  metodo: string | null;
  regimenIsr: string | null;
  renglones: readonly RenglonDelCierre[];
}

/** JSON no sabe de `bigint`: las cantidades y los valores se escriben como texto. */
const comoTexto = (_llave: string, valor: unknown): unknown => (typeof valor === 'bigint' ? valor.toString() : valor);

/**
 * sha256 de lo que vio quien revisa: los hallazgos, las cifras y cada renglón de la foto. Lo que se guarda al cerrar se
 * calcula otra vez dentro del candado; si la huella ya no coincide, algo cambió y se pide revisar de nuevo.
 */
export function huellaDelCierre(revisado: LoRevisado): string {
  const texto = JSON.stringify(revisado, comoTexto);
  return createHash('sha256').update(texto).digest('hex');
}
