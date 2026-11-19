import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';

/** El prefijo con que se propone el código de un artículo nuevo (`inventarios.codigos.prefijo`). */
export interface LectorDePrefijoDeCodigos {
  paraEmpresa(contexto: ContextoEmpresa): Promise<string>;
}
