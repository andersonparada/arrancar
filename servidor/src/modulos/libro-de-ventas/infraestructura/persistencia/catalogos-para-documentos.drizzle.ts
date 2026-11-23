import { eq, inArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  CatalogosParaDocumentos,
  ClienteParaDocumento,
  ConceptoParaLinea,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';

/** Lee el cliente (con su tercero), los conceptos y las localidades; la seguridad por filas deja ver solo lo de la cuenta y la empresa. */
export class CatalogosParaDocumentosDrizzle implements CatalogosParaDocumentos {
  async cliente(clienteId: string): Promise<ClienteParaDocumento | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        id: clientes.id,
        nombre: terceros.nombreMostrar,
        nit: terceros.nit,
        dpi: terceros.dpi,
        papelActivo: clientes.activo,
        terceroActivo: terceros.activo,
      })
      .from(clientes)
      .innerJoin(terceros, eq(terceros.id, clientes.terceroId))
      .where(eq(clientes.id, clienteId));
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      nit: fila.nit,
      dpi: fila.dpi,
      activo: fila.papelActivo && fila.terceroActivo,
    };
  }

  async conceptos(ids: readonly string[]): Promise<ConceptoParaLinea[]> {
    if (ids.length === 0) return [];
    return transaccionEnCurso()
      .select({
        id: conceptosDeIngreso.id,
        tipo: conceptosDeIngreso.tipo,
        activo: conceptosDeIngreso.activo,
        claveDeSistema: conceptosDeIngreso.claveDeSistema,
      })
      .from(conceptosDeIngreso)
      .where(inArray(conceptosDeIngreso.id, [...ids]));
  }

  async localidadExiste(localidadId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: localidades.id })
      .from(localidades)
      .where(eq(localidades.id, localidadId));
    return fila !== undefined;
  }
}
