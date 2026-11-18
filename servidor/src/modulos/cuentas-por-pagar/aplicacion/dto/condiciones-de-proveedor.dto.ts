import type { CondicionesDeProveedor } from '../../dominio/condiciones-de-proveedor.js';

/** Las condiciones de pago de un proveedor, para su formulario y su ficha. */
export interface CondicionesDeProveedorDto extends CondicionesDeProveedor {
  proveedorId: string;
  /** El plazo por omisión de la empresa activa (de 0 a 12 meses): el que rige si el proveedor no trae días. */
  mesesPorOmision: number;
}
