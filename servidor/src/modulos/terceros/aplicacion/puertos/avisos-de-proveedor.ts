import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { SeccionesAportadas } from '../../../core/contratos/secciones.contratos.js';

/** Lo que se avisa a los demás módulos cuando se guarda el papel de proveedor de un tercero. */
export interface ProveedorGuardado {
  proveedorId: string;
  terceroId: string;
  secciones: SeccionesAportadas;
}

/**
 * Puerto para avisar a los módulos activos que se guardó un proveedor, dentro de la misma transacción, para que
 * cada uno guarde su sección del formulario (todo o nada).
 */
export interface AvisosDeProveedor {
  proveedorGuardado(operador: Operador, aviso: ProveedorGuardado): Promise<void>;
}
