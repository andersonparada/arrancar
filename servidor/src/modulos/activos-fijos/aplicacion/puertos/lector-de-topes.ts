import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { TopeDeLey } from '../../dominio/clase.js';
import type { IncisoFiscal } from '../../dominio/incisos-fiscales.js';

/** El máximo de ley de cada inciso, resuelto para la empresa. */
export type TopesPorInciso = Readonly<Record<IncisoFiscal, TopeDeLey>>;

/** Lee los porcentajes máximos del art. 28 que fija la instalación (`activos-fijos.isr.maximo.*`). */
export interface LectorDeTopes {
  paraEmpresa(contexto: ContextoEmpresa): Promise<TopesPorInciso>;
}
