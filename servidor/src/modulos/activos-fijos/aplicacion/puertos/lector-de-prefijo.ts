import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';

/** El prefijo del código que se propone al dar de alta un activo (`activos-fijos.codigos.prefijo`). */
export interface LectorDePrefijo {
  paraEmpresa(contexto: ContextoEmpresa): Promise<string>;
}
