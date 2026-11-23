import { asc } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { categoriasProveedor } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import type { ConsultasDeCategoriasDeProveedor } from '../../aplicacion/casos-uso/efectivo/responder-llaves-de-enlace.js';

/** La tabla tiene seguridad por cuenta (RLS): solo se ven las categorías de la cuenta activa. */
export class CategoriasDeProveedorDrizzle implements ConsultasDeCategoriasDeProveedor {
  listar() {
    return transaccionEnCurso()
      .select({
        id: categoriasProveedor.id,
        nombre: categoriasProveedor.nombre,
        activo: categoriasProveedor.activo,
      })
      .from(categoriasProveedor)
      .orderBy(asc(categoriasProveedor.nombre));
  }
}
