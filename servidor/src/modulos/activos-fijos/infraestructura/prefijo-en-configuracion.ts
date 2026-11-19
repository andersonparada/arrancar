import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDePrefijo } from '../aplicacion/puertos/lector-de-prefijo.js';

/** El prefijo de los códigos de la empresa (`activos-fijos.codigos.prefijo`, `AF-` por omisión). */
export class PrefijoEnConfiguracion implements LectorDePrefijo {
  paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<string> {
    return configuracion.lector.obtener<string>('activos-fijos.codigos.prefijo', { cuentaId, empresaId });
  }
}
