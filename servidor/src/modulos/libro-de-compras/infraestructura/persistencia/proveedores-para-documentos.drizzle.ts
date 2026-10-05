import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  ProveedorParaDocumento,
  ProveedoresParaDocumentos,
} from '../../aplicacion/puertos/puertos-de-documentos.js';

/** Lee el proveedor y su tercero; la seguridad por cuenta (RLS) deja ver solo los de la cuenta. */
export class ProveedoresParaDocumentosDrizzle implements ProveedoresParaDocumentos {
  async buscar(proveedorId: string): Promise<ProveedorParaDocumento | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        id: proveedores.id,
        nombre: terceros.nombreMostrar,
        nit: terceros.nit,
        tipo: terceros.tipo,
        papelActivo: proveedores.activo,
        terceroActivo: terceros.activo,
      })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(proveedores.id, proveedorId));
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      nit: fila.nit,
      tipoDePersona: fila.tipo === 'individual' ? 'individual' : 'juridica',
      activo: fila.papelActivo && fila.terceroActivo,
    };
  }
}
