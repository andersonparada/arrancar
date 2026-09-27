import type { NivelConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import type { DestinoConfiguracion } from '../../dominio/destino.js';

export interface ValorGuardado {
  nivel: NivelConfiguracion;
  clave: string;
  valor: unknown;
}

export interface ValorAGuardar extends ValorGuardado {
  destino: DestinoConfiguracion;
  usuarioId: string;
}

/** Valores fijados desde la aplicación; los predeterminados viven en el código de cada módulo. */
export interface RepositorioConfiguraciones {
  /** Los de la instalación y, si el destino los indica, los de la cuenta y la empresa. */
  listar(destino: DestinoConfiguracion): Promise<ValorGuardado[]>;
  guardar(valor: ValorAGuardar): Promise<void>;
  eliminar(nivel: NivelConfiguracion, destino: DestinoConfiguracion, clave: string): Promise<void>;
}
