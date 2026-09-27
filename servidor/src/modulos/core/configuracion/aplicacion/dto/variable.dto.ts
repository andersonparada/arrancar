import type { NivelConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import type { DestinoConfiguracion } from '../../dominio/destino.js';
import type { OrigenValor, ValoresPorNivel } from '../resolucion.js';

/** Una variable con su valor en cada nivel y el que se aplica. */
export interface VariableDto {
  clave: string;
  descripcion: string;
  niveles: NivelConfiguracion[];
  predeterminado: unknown;
  valores: ValoresPorNivel;
  efectivo: unknown;
  origen: OrigenValor;
}

/** Para quién se consulta o cambia la configuración. */
export interface Alcance {
  destino: DestinoConfiguracion;
  /** Sin módulos, cuentan las variables de todos los instalados. */
  modulosActivos?: ReadonlySet<string>;
}
