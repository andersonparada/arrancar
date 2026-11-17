/**
 * El bloqueo que evita que dos operaciones a la vez pasen las dos bajo el umbral de bancarización al mismo proveedor: se toma
 * por proveedor y dura lo que la transacción.
 */
export interface BloqueoDeBancarizacion {
  /** Bloquea a los proveedores en orden de id; con otra operación que ya los tenga, espera a que termine. */
  bloquear(proveedorIds: readonly string[]): Promise<void>;
}
