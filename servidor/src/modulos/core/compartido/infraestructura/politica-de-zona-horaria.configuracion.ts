import { configuracion } from '../../configuracion/contexto.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { PoliticaDeZonaHoraria } from '../aplicacion/reloj.js';

export const ZONA_HORARIA_DE_LA_EMPRESA = 'core.regional.zona_horaria';

/** Lo dice la variable `core.regional.zona_horaria` de la empresa, la cuenta o la instalación. */
export class PoliticaDeZonaHorariaEnConfiguracion implements PoliticaDeZonaHoraria {
  zonaHoraria({ cuentaId, empresaId }: ContextoEmpresa): Promise<string> {
    return configuracion.lector.obtener<string>(ZONA_HORARIA_DE_LA_EMPRESA, { cuentaId, empresaId });
  }
}
