import { and, asc, eq, ne, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ConsultasDeCuadre, SumasDeProveedorEnElCuadre } from '../../aplicacion/puertos/puertos-de-cuadre.js';
import { documentos } from './documentos.tablas.js';

const saldosDonde = (condicion: SQL) =>
  sql<string>`coalesce(sum(${documentos.saldoAlInicio}) filter (where ${condicion}), 0)`;

/** Suma el saldo al inicio de los saldos iniciales vigentes (RLS limita a la empresa activa). */
export class ConsultasDeCuadreDrizzle implements ConsultasDeCuadre {
  async sumasPorProveedor(): Promise<SumasDeProveedorEnElCuadre[]> {
    const filas = await this.sumasEnTexto();
    return filas.map((fila) => ({
      proveedorId: fila.proveedorId,
      proveedorNombre: fila.proveedorNombre,
      proveedorNit: fila.proveedorNit,
      documentos: fila.documentos,
      cargosCentavos: aCentavos(fila.cargos),
      notasAFavorCentavos: aCentavos(fila.notasAFavor),
      retencionesPorPracticarCentavos: aCentavos(fila.retenciones),
    }));
  }

  private sumasEnTexto() {
    return transaccionEnCurso()
      .select({
        proveedorId: documentos.proveedorId,
        proveedorNombre: terceros.nombreMostrar,
        proveedorNit: terceros.nit,
        documentos: sql<number>`count(*)`.mapWith(Number),
        cargos: saldosDonde(sql`${documentos.tipo} <> 'nota_de_credito'`),
        notasAFavor: saldosDonde(sql`${documentos.tipo} = 'nota_de_credito'`),
        retenciones: sql<string>`coalesce(sum(${documentos.retencionesPorPracticar}), 0)`,
      })
      .from(documentos)
      .innerJoin(proveedores, eq(proveedores.id, documentos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(and(eq(documentos.origen, 'saldo_inicial'), ne(documentos.estado, 'anulado')))
      .groupBy(documentos.proveedorId, terceros.nombreMostrar, terceros.nit)
      .orderBy(asc(terceros.nombreMostrar), asc(documentos.proveedorId));
  }
}
