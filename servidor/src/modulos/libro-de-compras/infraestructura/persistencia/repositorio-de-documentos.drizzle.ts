import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ClaveDeDocumento, RepositorioDeDocumentos } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoDeCompra } from '../../dominio/documento-de-compra.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { retenciones } from './retenciones.tablas.js';

/** El mismo proveedor, tipo, serie y número (los marcados y los desmarcados). */
function delProveedor(clave: ClaveDeDocumento): SQL | undefined {
  return and(
    eq(documentos.proveedorId, clave.proveedorId),
    eq(documentos.tipo, clave.tipo),
    sql`coalesce(${documentos.serie}, '') = ${clave.serie ?? ''}`,
    eq(documentos.numero, clave.numero),
  );
}

/** El mismo NIT del emisor, tipo, serie y número entre los documentos que van en el libro. */
function delSat(clave: ClaveDeDocumento): SQL | undefined {
  if (!clave.muestraEnReportesSat || !clave.nitEmisor || !clave.serie) return undefined;
  return and(
    eq(documentos.muestraEnReportesSat, true),
    eq(documentos.nitEmisor, clave.nitEmisor),
    eq(documentos.tipo, clave.tipo),
    eq(documentos.serie, clave.serie),
    eq(documentos.numero, clave.numero),
  );
}

const deLaFel = (clave: ClaveDeDocumento): SQL | undefined =>
  clave.autorizacionFel ? eq(documentos.autorizacionFel, clave.autorizacionFel) : undefined;

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosDrizzle implements RepositorioDeDocumentos {
  async agregar(documento: DocumentoDeCompra): Promise<void> {
    const filas = mapeadorDeDocumento.aFilas(documento);
    const transaccion = transaccionEnCurso();
    await transaccion.insert(documentos).values(filas.documento);
    await transaccion.insert(lineasDeDocumento).values(filas.lineas);
    if (filas.retenciones.length > 0) await transaccion.insert(retenciones).values(filas.retenciones);
  }

  async buscarRepetido(clave: ClaveDeDocumento): Promise<{ id: string } | null> {
    const [fila] = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(and(eq(documentos.estado, 'vigente'), or(delProveedor(clave), delSat(clave), deLaFel(clave))))
      .limit(1);
    return fila ?? null;
  }
}
