import { and, asc, eq, lt, ne, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ConsultasDeCuadre, SumasDeProveedorEnElCuadre } from '../../aplicacion/puertos/puertos-de-cuadre.js';
import type { DocumentosDelLibroAnteriores } from '../../dominio/revision-de-cierre.js';
import { notasPosterioresDe, tieneNotasPosteriores } from '../../dominio/notas-posteriores.js';
import { notasLibresDelSistemaAnterior } from './consultas-del-sistema-anterior.drizzle.js';
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
      documentosConRetenciones: fila.documentosConRetenciones,
      cargosCentavos: aCentavos(fila.cargos),
      notasAFavorCentavos: aCentavos(fila.notasAFavor),
      retencionesPorPracticarCentavos: aCentavos(fila.retenciones),
    }));
  }

  async saldosConNotasPosteriores(): Promise<Map<string, number>> {
    const libres = await notasLibresDelSistemaAnterior();
    const cuantos = new Map<string, number>();
    if (libres.length === 0) return cuantos;
    const saldos = await transaccionEnCurso()
      .select({
        proveedorId: documentos.proveedorId,
        tipo: documentos.tipo,
        serie: documentos.serie,
        numero: documentos.numero,
      })
      .from(documentos)
      .where(and(eq(documentos.origen, 'saldo_inicial'), ne(documentos.estado, 'anulado')));
    for (const saldo of saldos) {
      if (!tieneNotasPosteriores(notasPosterioresDe(saldo, libres))) continue;
      cuantos.set(saldo.proveedorId, (cuantos.get(saldo.proveedorId) ?? 0) + 1);
    }
    return cuantos;
  }

  async documentosDelLibroAnterioresA(fechaDeInicio: string): Promise<DocumentosDelLibroAnteriores> {
    const [fila] = await transaccionEnCurso()
      .select({
        cantidad: sql<number>`count(*)`.mapWith(Number),
        cargos: sql<string>`coalesce(sum(${documentos.total}) filter (where ${documentos.tipo} <> 'nota_de_credito'), 0)`,
        notas: sql<string>`coalesce(sum(${documentos.total}) filter (where ${documentos.tipo} = 'nota_de_credito'), 0)`,
      })
      .from(documentos)
      .where(
        and(
          eq(documentos.origen, 'libro_de_compras'),
          ne(documentos.estado, 'anulado'),
          lt(documentos.fechaEmision, fechaDeInicio),
        ),
      );
    return {
      cantidad: fila?.cantidad ?? 0,
      montoCentavos: aCentavos(fila?.cargos ?? '0') - aCentavos(fila?.notas ?? '0'),
    };
  }

  private sumasEnTexto() {
    return transaccionEnCurso()
      .select({
        proveedorId: documentos.proveedorId,
        proveedorNombre: terceros.nombreMostrar,
        proveedorNit: terceros.nit,
        documentos: sql<number>`count(*)`.mapWith(Number),
        documentosConRetenciones:
          sql<number>`count(*) filter (where ${documentos.retencionesPorPracticar} > 0)`.mapWith(Number),
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
