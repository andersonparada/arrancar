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

/** Lo que se avisa al cerrar o reabrir la carga inicial de una empresa. */
export interface CambioDeLaCarga {
  empresaId: string;
  /** La fecha de inicio de la empresa, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Puerto para avisar a los módulos activos que la carga inicial se cierra o se reabre, dentro de la misma
 * transacción: el que no lo acepta lanza su error y el cambio se deshace. El operador lleva `empresaId` = la empresa.
 */
export interface AvisosDeLaCarga {
  cargaPorCerrar(operador: Operador, aviso: CambioDeLaCarga): Promise<void>;
  cargaPorReabrir(operador: Operador, aviso: CambioDeLaCarga): Promise<void>;
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
