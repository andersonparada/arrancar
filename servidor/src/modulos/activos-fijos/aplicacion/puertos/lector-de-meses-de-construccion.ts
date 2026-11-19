import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';

/** Los meses de una obra sin cerrar después de los cuales sale como hallazgo (`activos-fijos.construccion.meses_de_aviso`). */
export interface LectorDeMesesDeConstruccion {
  paraEmpresa(contexto: ContextoEmpresa): Promise<number>;
}
