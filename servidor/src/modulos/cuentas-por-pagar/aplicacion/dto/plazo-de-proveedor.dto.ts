import type { CondicionesDeProveedor } from '../../dominio/condiciones-de-proveedor.js';

/** Una fila del Excel «Plazos de proveedores»: el proveedor y sus condiciones de pago. */
export interface PlazoDeProveedorDto extends CondicionesDeProveedor {
  proveedorId: string;
  nit: string | null;
  proveedorNombre: string;
}

/** Cómo una fila del Excel dice a qué proveedor se refiere: por NIT o, sin NIT, por nombre. */
export interface IdentidadDeProveedor {
  nit?: string | null;
  proveedorNombre?: string | null;
}
