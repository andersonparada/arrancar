import type { IdentidadDeProveedor, PlazoDeProveedorDto } from '../dto/plazo-de-proveedor.dto.js';

/** Lectura de los proveedores de la cuenta con su plazo, para el Excel «Plazos de proveedores». */
export interface ProveedoresDeLosPlazos {
  /** Todos los proveedores de la cuenta con sus condiciones (las de por omisión si no guardaron ninguna). */
  listar(): Promise<PlazoDeProveedorDto[]>;
  /** Los ids de los proveedores con ese NIT o, si no se da NIT, con ese nombre exacto. */
  buscar(identidad: IdentidadDeProveedor): Promise<string[]>;
}
