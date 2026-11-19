import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { PrimerMes } from '../../dominio/depreciacion/meses.js';

/** La regla de la empresa para el primer mes de depreciación (`activos-fijos.depreciacion.primer_mes`, §3.6). */
export interface LectorDePrimerMes {
  paraEmpresa(contexto: ContextoEmpresa): Promise<PrimerMes>;
}
