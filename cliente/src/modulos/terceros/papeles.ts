import type { PapelTercero } from './servicios/terceros.api';

/** Asignar, cambiar o quitar un papel exige su propio permiso, además de `terceros.gestionar`. */
export const PERMISO_DEL_PAPEL: Record<PapelTercero, string> = {
  cliente: 'clientes.gestionar',
  proveedor: 'proveedores.gestionar',
};

/** Cada papel tiene su pantalla: `clientes`, `clientes.nuevo`, `clientes.ficha`, `clientes.editar`… */
export const RUTAS_DEL_PAPEL: Record<PapelTercero, 'clientes' | 'proveedores'> = {
  cliente: 'clientes',
  proveedor: 'proveedores',
};
