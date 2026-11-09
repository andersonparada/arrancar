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

/** Lo que se avisa antes de cambiar la fecha de inicio de una empresa que ya tenía carga inicial. */
export interface FechaDeInicioPorCambiar {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Puerto para preguntar a los módulos activos si aceptan la fecha de inicio nueva, dentro de la misma transacción:
 * el que no la acepta lanza su error y el cambio se deshace. El operador lleva `empresaId` = la empresa.
 */
export interface AvisosDeFechaDeInicio {
  fechaDeInicioPorCambiar(operador: Operador, aviso: FechaDeInicioPorCambiar): Promise<void>;
}
