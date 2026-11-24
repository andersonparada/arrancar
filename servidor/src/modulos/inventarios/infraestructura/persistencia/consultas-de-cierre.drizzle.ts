import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import { documentos as documentosDelLibro } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { ConsultasDeCierre, HallazgosDeLaBase } from '../../aplicacion/puertos/consultas-de-cierre.js';
import type { ArticuloAlCorte } from '../../dominio/cierre/existencias-del-cierre.js';
import type { GrupoDeReferencias } from '../../dominio/cierre/hallazgos-del-cierre.js';
import { ultimoDiaDelMes } from '../../dominio/cierre/meses.js';
import { documentos } from './documentos.tablas.js';
import { existenciasAlCorte } from './existencias-al-corte.drizzle.js';
import { movimientos } from './movimientos.tablas.js';

const REFERENCIAS_QUE_SE_MUESTRAN = 10;

/** Las lecturas del cierre mensual; leen toda la empresa (la seguridad por empresa la pone la transacción). */
export class ConsultasDeCierreDrizzle implements ConsultasDeCierre {
  existenciasAl(fin: string): Promise<ArticuloAlCorte[]> {
    return existenciasAlCorte(fin);
  }

  async primerMesConMovimientos(): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ fecha: movimientos.fecha })
      .from(movimientos)
      .where(eq(movimientos.vigente, true))
      .orderBy(asc(movimientos.fecha))
      .limit(1);
    return fila ? `${fila.fecha.slice(0, 7)}-01` : null;
  }

  async hallazgosDeLaBase(periodo: string): Promise<HallazgosDeLaBase> {
    const fin = ultimoDiaDelMes(periodo);
    return {
      conSaldosIniciales: await this.haySaldosIniciales(),
      recepcionesDeDocumentosAnulados: await this.recepcionesDeDocumentosAnulados(),
      trasladosEnTransito: await this.trasladosEnTransito(fin),
      lotesVencidos: await this.lotesVencidos(fin),
    };
  }

  async regimenIsr(periodo: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ regimenIsr: datosFiscalesDeEmpresa.regimenIsr })
      .from(datosFiscalesDeEmpresa)
      .where(or(isNull(datosFiscalesDeEmpresa.vigenteDesde), lte(datosFiscalesDeEmpresa.vigenteDesde, periodo)))
      .orderBy(sql`${datosFiscalesDeEmpresa.vigenteDesde} desc nulls last`)
      .limit(1);
    return fila?.regimenIsr ?? null;
  }

  private async haySaldosIniciales(): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(and(eq(movimientos.vigente, true), sql`${movimientos.fechaDeCapa} is not null`))
      .limit(1);
    return fila !== undefined;
  }

  /** Recepciones vigentes cuya factura del libro ya se anuló: Inventarios debió avisarlo, pero la anulación pudo llegar sin él. */
  private async recepcionesDeDocumentosAnulados(): Promise<GrupoDeReferencias> {
    const filas = await transaccionEnCurso()
      .select({ numero: documentos.numero })
      .from(documentos)
      .innerJoin(documentosDelLibro, eq(documentosDelLibro.id, documentos.documentoDeCompraId))
      .where(
        and(
          eq(documentos.clase, 'recepcion_de_compra'),
          eq(documentos.estado, 'vigente'),
          eq(documentosDelLibro.estado, 'anulado'),
        ),
      )
      .orderBy(asc(documentos.numero));
    return {
      cantidad: filas.length,
      referencias: filas.slice(0, REFERENCIAS_QUE_SE_MUESTRAN).map(({ numero }) => `Recepción ${numero}`),
    };
  }

  /** Traslados que salieron y no tenían recepción al final del día `fin` (los mismos que van «En tránsito interno»). */
  private async trasladosEnTransito(fin: string): Promise<number> {
    const { rows } = await transaccionEnCurso().execute<{ traslados: string }>(sql`
      select count(*)::text as traslados
        from inventarios.documentos d
       where d.clase = 'salida_de_traslado' and d.estado = 'vigente' and d.fecha <= ${fin}::date
         and not exists (
           select 1 from inventarios.documentos r
            where r.documento_relacionado_id = d.id and r.clase = 'entrada_de_traslado'
              and r.estado = 'vigente' and r.fecha <= ${fin}::date)`);
    return Number(rows[0]!.traslados);
  }

  /** Lotes con existencia al final del día `fin` cuyo vencimiento ya había pasado. */
  private async lotesVencidos(fin: string): Promise<number> {
    const { rows } = await transaccionEnCurso().execute<{ lotes: string }>(sql`
      select count(*)::text as lotes
        from (select m.lote_id, sum(m.cantidad) as cantidad
                from inventarios.movimientos m
                join inventarios.lotes l on l.id = m.lote_id
               where m.vigente and m.fecha <= ${fin}::date and l.fecha_de_vencimiento < ${fin}::date
               group by m.lote_id) t
       where t.cantidad > 0`);
    return Number(rows[0]!.lotes);
  }
}
