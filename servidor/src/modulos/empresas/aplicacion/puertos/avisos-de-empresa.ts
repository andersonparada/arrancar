import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { SeccionesAportadas } from '../../../core/contratos/secciones.contratos.js';

/** Lo que se avisa a los demás módulos cuando se guarda una empresa. */
export interface EmpresaGuardada {
  empresaId: string;
  secciones: SeccionesAportadas;
}

/**
 * Puerto para avisar a los módulos activos que se guardó una empresa, dentro de la misma transacción, para
 * que cada uno guarde su sección del formulario (todo o nada). El operador lleva `empresaId` = la empresa guardada.
 */
export interface AvisosDeEmpresa {
  empresaGuardada(operador: Operador, aviso: EmpresaGuardada): Promise<void>;
}
