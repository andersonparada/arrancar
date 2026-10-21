import type { CondicionesDeProveedor } from '../../dominio/condiciones-de-proveedor.js';

/** Las condiciones de pago de un proveedor, para su formulario y su ficha. */
export interface CondicionesDeProveedorDto extends CondicionesDeProveedor {
  proveedorId: string;
}
