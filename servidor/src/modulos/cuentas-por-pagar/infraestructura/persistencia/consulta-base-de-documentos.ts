import { eq, isNotNull, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { DatosDelLibro, FilaDeDocumento } from '../../aplicacion/puertos/puertos-de-consultas.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/** Nombres y apellidos juntos; `null` si el usuario no se pudo leer. */
function nombreCompleto(nombres: string | null, apellidos: string | null): string | null {
  return nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;
}

/**
 * Cada documento con lo que se calcula de las otras tablas: de dónde viene (proveedor y, si es del libro, su recepción), lo que
 * sus notas de crédito le rebajaron o él rebajó, y cuántas notas lo corrigen. Las filas salen de las tablas con RLS por
 * empresa, así que ninguna consulta necesita filtrar por empresa.
 */
export class ConsultaBaseDeDocumentos {
  private readonly transaccion = transaccionEnCurso();

  /** Lo que las notas de crédito rebajaron, por cargo. */
  readonly alCargo = this.transaccion
    .select({
      cargoId: aplicacionesDeNotas.cargoId,
      monto: sql<string>`sum(${aplicacionesDeNotas.monto})`.as('monto_al_cargo'),
      manuales: sql<number>`count(*) filter (where ${aplicacionesDeNotas.forma} = 'manual')`
        .mapWith(Number)
        .as('manuales_al_cargo'),
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

  /** Lo que se dio de baja del saldo libre de cada nota con ajustes vigentes, y cuántos son. */
  readonly ajustadoDeLaNota = this.transaccion
    .select({
      notaId: ajustesDeSaldo.documentoId,
      monto: sql<string>`sum(${ajustesDeSaldo.monto})`.as('monto_ajustado'),
      vigentes: sql<number>`count(*)`.mapWith(Number).as('ajustes_vigentes'),
    })
    .from(ajustesDeSaldo)
    .where(eq(ajustesDeSaldo.estado, 'vigente'))
    .groupBy(ajustesDeSaldo.documentoId)
    .as('ajustado_de_la_nota');

  /**
   * Lo que se lee del documento del libro (recepción, período y anulación, con el nombre de quien anuló). Va como
   * subconsulta: Drizzle no resuelve bien un `leftJoin` a otra tabla llamada también `documentos`.
   */
  private readonly libro = this.transaccion
    .select({
      id: documentosDeCompra.id,
      fechaRecepcion: documentosDeCompra.fechaRecepcion,
      periodo: documentosDeCompra.periodo,
      causaDeAnulacion: documentosDeCompra.causaDeAnulacion,
      motivoDeAnulacion: documentosDeCompra.motivoDeAnulacion,
      anuladoPorEnElLibro: documentosDeCompra.anuladoPor,
      anuladoEnElLibro: documentosDeCompra.anuladoEn,
      anuladoPorNombres: usuarios.nombres,
      anuladoPorApellidos: usuarios.apellidos,
    })
    .from(documentosDeCompra)
    .leftJoin(usuarios, eq(usuarios.id, documentosDeCompra.anuladoPor))
    .as('datos_del_libro');

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

  /** Lo que se toma del libro en cada fila (nulo en un saldo inicial). */
  private columnasDelLibro() {
    const { libro } = this;
    return {
      fechaRecepcion: libro.fechaRecepcion,
      periodo: libro.periodo,
      causaDeAnulacion: libro.causaDeAnulacion,
      motivoDeAnulacion: libro.motivoDeAnulacion,
      anuladoPorEnElLibro: libro.anuladoPorEnElLibro,
      anuladoEnElLibro: libro.anuladoEnElLibro,
      anuladoPorNombres: libro.anuladoPorNombres,
      anuladoPorApellidos: libro.anuladoPorApellidos,
    };
  }

  /** Todas las columnas y uniones; quien llama agrega `where`, orden y límite. */
  seleccionar() {
    return this.transaccion
      .select({
        documento: documentos,
        proveedorNombre: terceros.nombreMostrar,
        proveedorNit: terceros.nit,
        ...this.columnasDelLibro(),
        alCargo: this.alCargo.monto,
        porLaNota: this.porLaNota.monto,
        manuales: this.alCargo.manuales,
        ajustado: this.ajustadoDeLaNota.monto,
        ajustesVigentes: this.ajustadoDeLaNota.vigentes,
        notasEnTotal: this.notas.enTotal,
        notasVigentes: this.notas.vigentes,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(documentos)
      .leftJoin(this.libro, eq(this.libro.id, documentos.documentoId))
      .innerJoin(proveedores, eq(proveedores.id, documentos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .leftJoin(this.alCargo, eq(this.alCargo.cargoId, documentos.id))
      .leftJoin(this.porLaNota, eq(this.porLaNota.notaId, documentos.id))
      .leftJoin(this.ajustadoDeLaNota, eq(this.ajustadoDeLaNota.notaId, documentos.id))
      .leftJoin(this.notas, eq(this.notas.afectadoId, documentos.documentoId));
  }

  /**
   * Lo que falta por pagar de un cargo, en SQL: el saldo al inicio (si es un saldo inicial) o el total menos las
   * retenciones, menos lo que le rebajaron. Las retenciones por practicar no entran.
   */
  saldoDelCargo() {
    return sql`(coalesce(${documentos.saldoAlInicio}, ${documentos.total} - ${documentos.retenciones}) - coalesce(${this.alCargo.monto}, 0))`;
  }

  /** El saldo libre de una nota de crédito, en SQL: su base menos lo que aplicó y lo que se ajustó (vigente). */
  saldoLibreDeLaNota() {
    return sql`(coalesce(${documentos.saldoAlInicio}, ${documentos.total}) - coalesce(${this.porLaNota.monto}, 0) - coalesce(${this.ajustadoDeLaNota.monto}, 0))`;
  }
}

type FilaSeleccionada = Awaited<ReturnType<ReturnType<ConsultaBaseDeDocumentos['seleccionar']>['limit']>>[number];

function datosDelLibroDe(fila: FilaSeleccionada): DatosDelLibro {
  return {
    proveedorNombre: fila.proveedorNombre,
    proveedorNit: fila.proveedorNit,
    fechaRecepcion: fila.fechaRecepcion,
    periodo: fila.periodo,
    anulacion: {
      causa: fila.causaDeAnulacion,
      motivo: fila.motivoDeAnulacion,
      anuladoPor: fila.anuladoPorEnElLibro,
      anuladoPorNombre: nombreCompleto(fila.anuladoPorNombres, fila.anuladoPorApellidos),
      anuladoEn: fila.anuladoEnElLibro,
    },
  };
}

/** De la fila de SQL al documento con sus cuentas, en centavos. */
export function aFilaDeDocumento(fila: FilaSeleccionada): FilaDeDocumento {
  return {
    documento: mapeadorDeDocumento.aDominio(fila.documento),
    libro: datosDelLibroDe(fila),
    creadoEn: fila.documento.creadoEn.toISOString(),
    aplicadoAlCargoCentavos: aCentavos(fila.alCargo ?? '0'),
    aplicadoPorLaNotaCentavos: aCentavos(fila.porLaNota ?? '0'),
    ajustadoCentavos: aCentavos(fila.ajustado ?? '0'),
    ajustesVigentes: fila.ajustesVigentes ?? 0,
    aplicacionesManualesRecibidas: fila.manuales ?? 0,
    notasVigentes: fila.notasVigentes ?? 0,
    notasEnTotal: fila.notasEnTotal ?? 0,
  };
}
