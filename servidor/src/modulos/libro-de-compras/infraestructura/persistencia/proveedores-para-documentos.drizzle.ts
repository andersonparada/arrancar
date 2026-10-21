import { eq, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  ProveedorParaDocumento,
  ProveedoresParaDocumentos,
} from '../../aplicacion/puertos/puertos-de-documentos.js';

/** Lee el proveedor y su tercero; la seguridad por cuenta (RLS) deja ver solo los de la cuenta. */
export class ProveedoresParaDocumentosDrizzle implements ProveedoresParaDocumentos {
  buscar(proveedorId: string): Promise<ProveedorParaDocumento | null> {
    return this.buscarDonde(eq(proveedores.id, proveedorId));
  }

  buscarPorNit(nit: string): Promise<ProveedorParaDocumento | null> {
    return this.buscarDonde(eq(terceros.nit, nit));
  }

  private async buscarDonde(condicion: SQL): Promise<ProveedorParaDocumento | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        id: proveedores.id,
        nombre: terceros.nombreMostrar,
        nit: terceros.nit,
        dpi: terceros.dpi,
        tipo: terceros.tipo,
        papelActivo: proveedores.activo,
        terceroActivo: terceros.activo,
      })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(condicion);
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      nit: fila.nit,
      dpi: fila.dpi,
      tipoDePersona: fila.tipo === 'individual' ? 'individual' : 'juridica',
      activo: fila.papelActivo && fila.terceroActivo,
    };
  }
}
