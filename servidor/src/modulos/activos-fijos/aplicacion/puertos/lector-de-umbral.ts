import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';

/** El umbral de capitalización de la empresa (`activos-fijos.capitalizacion.umbral`), en centavos; 0 es sin umbral. */
export interface LectorDeUmbral {
  paraEmpresa(contexto: ContextoEmpresa): Promise<number>;
}
