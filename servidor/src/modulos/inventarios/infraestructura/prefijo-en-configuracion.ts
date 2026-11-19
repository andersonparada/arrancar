import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDePrefijoDeCodigos } from '../aplicacion/puertos/lector-de-prefijo-de-codigos.js';

/** Lee `inventarios.codigos.prefijo` de la configuración (empresa, cuenta, instalación o el predeterminado). */
export class PrefijoEnConfiguracion implements LectorDePrefijoDeCodigos {
  paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<string> {
    return configuracion.lector.obtener<string>('inventarios.codigos.prefijo', { cuentaId, empresaId });
  }
}
