import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import type { CondicionesDeProveedores } from '../../aplicacion/puertos/puertos-de-documentos.js';
import {
  CONDICIONES_POR_OMISION,
  type CambioDeCondiciones,
  type CondicionesDeProveedor,
} from '../../dominio/condiciones-de-proveedor.js';
import { condicionesDeProveedor } from './condiciones-de-proveedor.tablas.js';

/** Las tablas tienen seguridad por cuenta (RLS): solo se ven los proveedores y las condiciones de la cuenta activa. */
export class CondicionesDeProveedoresDrizzle implements CondicionesDeProveedores {
  async deProveedor(proveedorId: string): Promise<CondicionesDeProveedor> {
    const [fila] = await transaccionEnCurso()
      .select({
        diasDeCredito: condicionesDeProveedor.diasDeCredito,
        contarDesdeLaRecepcion: condicionesDeProveedor.contarDesdeLaRecepcion,
      })
      .from(condicionesDeProveedor)
      .where(eq(condicionesDeProveedor.proveedorId, proveedorId));
    return fila ?? CONDICIONES_POR_OMISION;
  }

  async existeElProveedor(proveedorId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.id, proveedorId));
    return fila !== undefined;
  }

  /** Crea la fila la primera vez y después cambia solo lo que trae el cambio; nunca se borra. */
  async guardar(proveedorId: string, cambio: CambioDeCondiciones): Promise<void> {
    const inicial = { ...CONDICIONES_POR_OMISION, ...cambio };
    await transaccionEnCurso()
      .insert(condicionesDeProveedor)
      .values({ proveedorId, ...inicial })
      .onConflictDoUpdate({
        target: condicionesDeProveedor.proveedorId,
        set: { ...cambio, actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() },
      });
  }
}
