import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDeUmbral } from '../aplicacion/puertos/lector-de-umbral.js';

/** El umbral de capitalización de la empresa (`activos-fijos.capitalizacion.umbral`, en quetzales) pasado a centavos. */
export class UmbralEnConfiguracion implements LectorDeUmbral {
  async paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    const quetzales = await configuracion.lector.obtener<number>('activos-fijos.capitalizacion.umbral', {
      cuentaId,
      empresaId,
    });
    return Math.round(quetzales * 100);
  }
}
