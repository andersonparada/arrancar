import { eq, isNotNull, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { FilaDeDocumento } from '../../aplicacion/puertos/puertos-de-consultas.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/**
 * Cada documento con lo que se calcula de las otras tablas: de dónde viene (serie, número y proveedor), lo que sus
 * notas de crédito le rebajaron o él rebajó, y cuántas notas lo corrigen. Las filas salen de las tablas con RLS por
 * empresa, así que ninguna consulta necesita filtrar por empresa.
 */
export class ConsultaBaseDeDocumentos {
  private readonly transaccion = transaccionEnCurso();

  /** Lo que las notas de crédito rebajaron, por cargo. */
  readonly alCargo = this.transaccion
    .select({
      cargoId: aplicacionesDeNotas.cargoId,
      monto: sql<string>`sum(${aplicacionesDeNotas.monto})`.as('monto_al_cargo'),
    })
    .from(aplicacionesDeNotas)
    .groupBy(aplicacionesDeNotas.cargoId)
    .as('aplicado_al_cargo');

  /** Lo que cada nota de crédito rebajó. */
  readonly porLaNota = this.transaccion
    .select({
      notaId: aplicacionesDeNotas.notaId,
      monto: sql<string>`sum(${aplicacionesDeNotas.monto})`.as('monto_por_la_nota'),
    })
    .from(aplicacionesDeNotas)
    .groupBy(aplicacionesDeNotas.notaId)
    .as('aplicado_por_la_nota');

  private readonly notas = this.transaccion
    .select({
      afectadoId: documentos.documentoAfectadoId,
      enTotal: sql<number>`count(*)`.mapWith(Number).as('en_total'),
      vigentes: sql<number>`count(*) filter (where ${documentos.estado} <> 'anulado')`.mapWith(Number).as('vigentes'),
    })
    .from(documentos)
    .where(isNotNull(documentos.documentoAfectadoId))
    .groupBy(documentos.documentoAfectadoId)
    .as('notas_del_documento');

  /** Todas las columnas y uniones; quien llama agrega `where`, orden y límite. */
  seleccionar() {
    return this.transaccion
      .select({
        documento: documentos,
        proveedorNombre: terceros.nombreMostrar,
        serie: documentosDeCompra.serie,
        numero: documentosDeCompra.numero,
        fechaRecepcion: documentosDeCompra.fechaRecepcion,
        periodo: documentosDeCompra.periodo,
        alCargo: this.alCargo.monto,
        porLaNota: this.porLaNota.monto,
        notasEnTotal: this.notas.enTotal,
        notasVigentes: this.notas.vigentes,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(documentos)
      .innerJoin(documentosDeCompra, eq(documentosDeCompra.id, documentos.documentoId))
      .innerJoin(proveedores, eq(proveedores.id, documentos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .leftJoin(this.alCargo, eq(this.alCargo.cargoId, documentos.id))
      .leftJoin(this.porLaNota, eq(this.porLaNota.notaId, documentos.id))
      .leftJoin(this.notas, eq(this.notas.afectadoId, documentos.documentoId));
  }

  /** Lo que falta por pagar de un cargo, en SQL: total menos retenciones menos lo que le rebajaron. */
  saldoDelCargo() {
    return sql`(${documentos.total} - ${documentos.retenciones} - coalesce(${this.alCargo.monto}, 0))`;
  }
}

type FilaSeleccionada = Awaited<ReturnType<ReturnType<ConsultaBaseDeDocumentos['seleccionar']>['limit']>>[number];

/** De la fila de SQL al documento con sus cuentas, en centavos. */
export function aFilaDeDocumento(fila: FilaSeleccionada): FilaDeDocumento {
  return {
    documento: mapeadorDeDocumento.aDominio(fila.documento),
    origen: {
      proveedorNombre: fila.proveedorNombre,
      serie: fila.serie,
      numero: fila.numero,
      fechaRecepcion: fila.fechaRecepcion,
      periodo: fila.periodo,
    },
    aplicadoAlCargoCentavos: aCentavos(fila.alCargo ?? '0'),
    aplicadoPorLaNotaCentavos: aCentavos(fila.porLaNota ?? '0'),
    notasVigentes: fila.notasVigentes ?? 0,
    notasEnTotal: fila.notasEnTotal ?? 0,
  };
}
