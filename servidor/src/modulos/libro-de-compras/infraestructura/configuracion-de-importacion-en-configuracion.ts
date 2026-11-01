import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type {
  ConfiguracionDeLaImportacion,
  LectorDeConfiguracionDeImportacion,
} from '../aplicacion/puertos/puertos-de-importacion.js';

const ZONA_HORARIA = 'core.regional.zona_horaria';
const DECIMALES = 'core.regional.decimales_montos';
const ENCABEZADOS = 'libro-de-compras.dte.encabezados_adicionales';

/** Lo que la importación de la SAT lee de la configuración, en una sola lectura. */
export class ConfiguracionDeImportacionEnConfiguracion implements LectorDeConfiguracionDeImportacion {
  async paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<ConfiguracionDeLaImportacion> {
    const variables = await configuracion.lector.listar({ destino: { cuentaId, empresaId } });
    const valores = new Map(variables.map((variable) => [variable.clave, variable.efectivo]));
    return {
      zonaHoraria: String(valores.get(ZONA_HORARIA)),
      decimales: Number(valores.get(DECIMALES)),
      encabezadosAdicionales: String(valores.get(ENCABEZADOS) ?? ''),
    };
  }
}
