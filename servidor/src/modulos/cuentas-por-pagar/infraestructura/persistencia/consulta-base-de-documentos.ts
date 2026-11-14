import { eq, isNotNull, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { DatosDelLibro, FilaDeDocumento } from '../../aplicacion/puertos/puertos-de-consultas.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';
import { pagosVigentesDe, SubconsultasDePagos } from './subconsultas-de-pagos.js';

/** Nombres y apellidos juntos; `null` si el usuario no se pudo leer. */
const nombreCompleto = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

/**
 * Cada documento con lo que se calcula de las otras tablas: de dónde viene (proveedor y, si es del libro, su recepción), lo que
 * sus notas de crédito le rebajaron o él rebajó, y cuántas notas lo corrigen. Las filas salen de las tablas con RLS por
 * empresa, así que ninguna consulta necesita filtrar por empresa.
 */
export class ConsultaBaseDeDocumentos {
  private readonly transaccion = transaccionEnCurso();
  private readonly deLosPagos = new SubconsultasDePagos();
  /** Lo que los pagos vigentes entregaron, por cargo (con la fecha de cada uno). */
  readonly pagadoAlCargo = this.deLosPagos.pagadoAlCargo;
  /** Lo que los reintegros vigentes devolvieron, por nota de crédito. */
  readonly reintegradoDeLaNota = this.deLosPagos.reintegradoDeLaNota;

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

  /** Lo que se dio de baja con ajustes vigentes (del saldo libre de una nota o la diferencia menor de un cargo), y cuántos son. */
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

  /** La contraseña vigente de cada documento (el índice único parcial garantiza una sola). */
  readonly contrasenaVigente = this.transaccion
    .select({
      documentoId: contrasenaDocumentos.documentoId,
      id: contrasenas.id,
      numero: contrasenas.numero,
      anioDeNumero: contrasenas.anioDeNumero,
    })
    .from(contrasenaDocumentos)
    .innerJoin(contrasenas, eq(contrasenas.id, contrasenaDocumentos.contrasenaId))
    .where(eq(contrasenaDocumentos.vigente, true))
    .as('contrasena_vigente_del_documento');

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

  /** Lo aplicado y lo ajustado, tal como lo suman las subconsultas. */
  private columnasDeLosMontos() {
    return {
      alCargo: this.alCargo.monto,
      porLaNota: this.porLaNota.monto,
      manuales: this.alCargo.manuales,
      ajustado: this.ajustadoDeLaNota.monto,
      ajustesVigentes: this.ajustadoDeLaNota.vigentes,
      pagos: this.pagadoAlCargo.pagos,
      reintegrado: this.reintegradoDeLaNota.monto,
      reintegrosVigentes: this.reintegradoDeLaNota.vigentes,
    };
  }

  /** Cuántas notas corrigen al documento (todas y las vigentes). */
  private columnasDeLasNotas() {
    return { notasEnTotal: this.notas.enTotal, notasVigentes: this.notas.vigentes };
  }

  /** Lo que se toma de la contraseña vigente en cada fila (nulo si el documento no está en una). */
  private columnasDeLaContrasena() {
    const { contrasenaVigente } = this;
    return {
      contrasenaId: contrasenaVigente.id,
      contrasenaNumero: contrasenaVigente.numero,
      contrasenaAnio: contrasenaVigente.anioDeNumero,
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
        ...this.columnasDeLosMontos(),
        ...this.columnasDeLasNotas(),
        ...this.columnasDeLaContrasena(),
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(documentos)
      .leftJoin(this.libro, eq(this.libro.id, documentos.documentoId))
      .innerJoin(proveedores, eq(proveedores.id, documentos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .leftJoin(this.alCargo, eq(this.alCargo.cargoId, documentos.id))
      .leftJoin(this.porLaNota, eq(this.porLaNota.notaId, documentos.id))
      .leftJoin(this.ajustadoDeLaNota, eq(this.ajustadoDeLaNota.notaId, documentos.id))
      .leftJoin(this.pagadoAlCargo, eq(this.pagadoAlCargo.cargoId, documentos.id))
      .leftJoin(this.reintegradoDeLaNota, eq(this.reintegradoDeLaNota.notaId, documentos.id))
      .leftJoin(this.notas, eq(this.notas.afectadoId, documentos.id))
      .leftJoin(this.contrasenaVigente, eq(this.contrasenaVigente.documentoId, documentos.id));
  }

  /**
   * Lo que falta por pagar de un cargo, en SQL: el saldo al inicio (si es un saldo inicial) o el total menos las
   * retenciones, menos lo que le rebajaron las notas, lo pagado (también lo posfechado, que ya está comprometido) y las
   * diferencias menores. Las retenciones por practicar no entran. Quien lo usa une las tres subconsultas.
   */
  saldoDelCargo() {
    const neto = sql`coalesce(${documentos.saldoAlInicio}, ${documentos.total} - ${documentos.retenciones})`;
    return sql`(${neto} - coalesce(${this.alCargo.monto}, 0) - coalesce(${this.pagadoAlCargo.monto}, 0) - coalesce(${this.ajustadoDeLaNota.monto}, 0))`;
  }

  /** El saldo libre de una nota de crédito, en SQL: su base menos lo que aplicó, lo que se ajustó y lo que se reintegró. */
  saldoLibreDeLaNota() {
    const base = sql`coalesce(${documentos.saldoAlInicio}, ${documentos.total})`;
    return sql`(${base} - coalesce(${this.porLaNota.monto}, 0) - coalesce(${this.ajustadoDeLaNota.monto}, 0) - coalesce(${this.reintegradoDeLaNota.monto}, 0))`;
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

function contrasenaDe(fila: FilaSeleccionada): FilaDeDocumento['contrasena'] {
  if (fila.contrasenaId === null || fila.contrasenaNumero === null) return null;
  return { id: fila.contrasenaId, numero: numeroDeContrasena(fila.contrasenaNumero, fila.contrasenaAnio ?? 0) };
}

/** Lo que las notas, los pagos, los ajustes y los reintegros rebajaron, y cuántos ajustes y reintegros vigentes hay. */
function rebajasDe(fila: FilaSeleccionada) {
  return {
    aplicadoAlCargoCentavos: aCentavos(fila.alCargo ?? '0'),
    aplicadoPorLaNotaCentavos: aCentavos(fila.porLaNota ?? '0'),
    ajustadoCentavos: aCentavos(fila.ajustado ?? '0'),
    ajustesVigentes: fila.ajustesVigentes ?? 0,
    pagosVigentes: pagosVigentesDe(fila.pagos),
    reintegradoCentavos: aCentavos(fila.reintegrado ?? '0'),
    reintegrosVigentes: fila.reintegrosVigentes ?? 0,
  };
}

/** De la fila de SQL al documento con sus cuentas, en centavos. */
export function aFilaDeDocumento(fila: FilaSeleccionada): FilaDeDocumento {
  return {
    documento: mapeadorDeDocumento.aDominio(fila.documento),
    libro: datosDelLibroDe(fila),
    creadoEn: fila.documento.creadoEn.toISOString(),
    ...rebajasDe(fila),
    aplicacionesManualesRecibidas: fila.manuales ?? 0,
    notasVigentes: fila.notasVigentes ?? 0,
    notasEnTotal: fila.notasEnTotal ?? 0,
    contrasena: contrasenaDe(fila),
  };
}
