import { and, asc, eq, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { NotaDeLaFacturaDto } from '../../aplicacion/dto/documento-de-venta.dto.js';
import type {
  ClaveDeDocumentoDeVenta,
  DatosDeAnulacionGuardada,
  DocumentoGuardadoDeVenta,
  FacturaConNotasGuardada,
  RepositorioDeDocumentosDeVenta,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoDeVenta } from '../../dominio/documento-de-venta.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import { mapeadorDeDocumentoDeVenta } from './documento-de-venta.mapeador.js';
import { documentos } from './documentos.tablas.js';
import { fichaDe, type FilaDeDocumento } from './ficha-de-documento-de-venta.mapeador.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

const cambioDeAutoria = () => ({ actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() });

/** Las notas (de cualquier clase, vigentes o anuladas) que corrigen al documento. */
async function notasDe(documentoId: string): Promise<NotaDeLaFacturaDto[]> {
  const filas = await transaccionEnCurso()
    .select({
      id: documentos.id,
      tipo: documentos.tipo,
      serie: documentos.serie,
      numero: documentos.numero,
      fechaEmision: documentos.fechaEmision,
      total: documentos.total,
      estado: documentos.estado,
    })
    .from(documentos)
    .where(eq(documentos.documentoAfectadoId, documentoId))
    .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
  return filas;
}

async function lineasDe(documentoId: string) {
  return transaccionEnCurso()
    .select({
      id: lineasDeDocumento.id,
      orden: lineasDeDocumento.orden,
      conceptoDeIngresoId: lineasDeDocumento.conceptoDeIngresoId,
      conceptoDeIngresoNombre: conceptosDeIngreso.nombre,
      tipo: lineasDeDocumento.tipo,
      claseFiscal: lineasDeDocumento.claseFiscal,
      descripcion: lineasDeDocumento.descripcion,
      total: lineasDeDocumento.total,
      base: lineasDeDocumento.base,
      iva: lineasDeDocumento.iva,
      otrosImpuestos: lineasDeDocumento.otrosImpuestos,
    })
    .from(lineasDeDocumento)
    .innerJoin(conceptosDeIngreso, eq(conceptosDeIngreso.id, lineasDeDocumento.conceptoDeIngresoId))
    .where(eq(lineasDeDocumento.documentoId, documentoId))
    .orderBy(asc(lineasDeDocumento.orden));
}

async function filaDe(documentoId: string, bloquear: boolean): Promise<FilaDeDocumento | undefined> {
  const consulta = transaccionEnCurso().select().from(documentos).where(eq(documentos.id, documentoId));
  const [fila] = bloquear ? await consulta.for('update') : await consulta;
  return fila;
}

/** Suma de las notas de una clase que siguen vigentes: lo que ya corrigieron de la factura. */
async function sumaDeNotasVigentes(facturaId: string, tipo: 'nota_de_credito' | 'nota_de_debito') {
  const [suma] = await transaccionEnCurso()
    .select({
      total: sql<string>`coalesce(sum(${documentos.total}), 0)::text`,
      iva: sql<string>`coalesce(sum(${documentos.iva}), 0)::text`,
    })
    .from(documentos)
    .where(
      and(eq(documentos.documentoAfectadoId, facturaId), eq(documentos.estado, 'vigente'), eq(documentos.tipo, tipo)),
    );
  return { total: aCentavos(suma!.total), iva: aCentavos(suma!.iva) };
}

/** Documentos de venta en PostgreSQL; la seguridad por empresa (RLS) limita todo a la empresa de la transacción. */
export class RepositorioDeDocumentosDeVentaDrizzle implements RepositorioDeDocumentosDeVenta {
  async agregar(documento: DocumentoDeVenta): Promise<void> {
    const filas = mapeadorDeDocumentoDeVenta.aFilas(documento);
    const transaccion = transaccionEnCurso();
    await transaccion.insert(documentos).values(filas.documento);
    await transaccion.insert(lineasDeDocumento).values(filas.lineas);
  }

  /** Un número anulado tampoco se reutiliza: la búsqueda no distingue el estado. */
  async buscarRepetido(clave: ClaveDeDocumentoDeVenta): Promise<{ id: string } | null> {
    const mismoNumero = and(
      sql`coalesce(${documentos.tipoDte}, ${documentos.tipo}) = ${clave.tipoOTipoDte}`,
      sql`coalesce(${documentos.serie}, '') = ${clave.serie ?? ''}`,
      eq(documentos.numero, clave.numero),
    );
    const misma = clave.autorizacionFel ? sql`${documentos.autorizacionFel} = ${clave.autorizacionFel}` : sql`false`;
    const [fila] = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(sql`(${mismoNumero}) or ${misma}`)
      .limit(1);
    return fila ?? null;
  }

  async buscar(documentoId: string, bloquear: boolean): Promise<DocumentoGuardadoDeVenta | null> {
    const fila = await filaDe(documentoId, bloquear);
    if (!fila) return null;
    const [lineas, notas] = await Promise.all([lineasDe(documentoId), notasDe(documentoId)]);
    const hechos = {
      anulado: fila.estado === 'anulado',
      procesadoEnElDestino: fila.procesadoEnDestinoEn !== null,
      notasVigentes: notas.filter((nota) => nota.estado === 'vigente').length,
      notasEnTotal: notas.length,
    };
    return { ficha: fichaDe(fila, { lineas, notas, hechos }), hechos, clienteId: fila.clienteId };
  }

  async facturaConNotas(facturaId: string, bloquear: boolean): Promise<FacturaConNotasGuardada | null> {
    const fila = await filaDe(facturaId, bloquear);
    if (!fila) return null;
    const credito = await sumaDeNotasVigentes(facturaId, 'nota_de_credito');
    const debito = await sumaDeNotasVigentes(facturaId, 'nota_de_debito');
    return {
      id: fila.id,
      tipo: fila.tipo,
      estado: fila.estado,
      clienteId: fila.clienteId,
      fechaEmision: fila.fechaEmision,
      destino: fila.destino,
      total: aCentavos(fila.total),
      iva: aCentavos(fila.iva),
      totalDeNotasDeCredito: credito.total,
      ivaDeNotasDeCredito: credito.iva,
      totalDeNotasDeDebito: debito.total,
      ivaDeNotasDeDebito: debito.iva,
    };
  }

  async anular(documentoId: string, datos: DatosDeAnulacionGuardada): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({
        estado: 'anulado',
        anuladoEn: new Date(),
        anuladoPor: datos.anuladoPor,
        motivoDeAnulacion: datos.motivo,
        causaDeAnulacion: datos.causa,
        fechaDeAnulacion: datos.fecha,
        ...cambioDeAutoria(),
      })
      .where(eq(documentos.id, documentoId));
  }

  async eliminar(documentoId: string): Promise<void> {
    await transaccionEnCurso().delete(documentos).where(eq(documentos.id, documentoId));
  }

  async marcarProcesado(documentoId: string, procesado: boolean): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ procesadoEnDestinoEn: procesado ? new Date() : null, ...cambioDeAutoria() })
      .where(eq(documentos.id, documentoId));
  }
}
