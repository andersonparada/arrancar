import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDeSaldoInicial } from '../../dominio/saldo-inicial.js';
import { anterioresAlInicioDe, saldoDe } from '../../dominio/saldos.js';
import { aplicadoDe } from './dto-de-documento-por-pagar.js';
import type { FilaDeDocumento } from '../puertos/puertos-de-consultas.js';
import { SIN_NOTAS_POSTERIORES, type NotasPosteriores } from '../../dominio/notas-posteriores.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from './saldo-inicial.dto.js';

/** La solicitud con el dinero en centavos; lo que no viene vale cero (o falso). */
export function datosDeSolicitud(solicitud: SolicitudDeSaldoInicial): DatosDeSaldoInicial {
  return {
    proveedorId: solicitud.proveedorId,
    tipo: solicitud.tipo,
    serie: solicitud.serie,
    numero: solicitud.numero,
    fechaEmision: solicitud.fechaEmision,
    vencimiento: solicitud.vencimiento,
    totalCentavos: aCentavos(solicitud.total),
    retencionesCentavos: aCentavos(solicitud.retenciones ?? '0'),
    retencionesPorPracticarCentavos: aCentavos(solicitud.retencionesPorPracticar ?? '0'),
    saldoPendienteCentavos: aCentavos(solicitud.saldoPendiente),
    referencia: solicitud.referencia,
    tieneActivoFijo: solicitud.tieneActivoFijo ?? false,
  };
}

/**
 * Se puede corregir o eliminar con la carga abierta, completado, sin notas aplicadas, sin pagos ni reintegros vigentes y sin ninguna nota que lo corrija
 * (las demás reglas, las de dominio).
 */
function sePuedeCambiar(fila: FilaDeDocumento, cargaCerrada: boolean): boolean {
  const sinMovimientos =
    fila.aplicadoAlCargoCentavos === 0 &&
    fila.aplicadoPorLaNotaCentavos === 0 &&
    fila.ajustesVigentes === 0 &&
    fila.pagosVigentes.length === 0 &&
    fila.reintegrosVigentes === 0 &&
    fila.notasEnTotal === 0;
  return !cargaCerrada && fila.documento.estado === 'registrado' && sinMovimientos;
}

/** Los montos de la ficha: lo cargado, lo anterior al corte y lo que se debe hoy. */
function montosDe(fila: FilaDeDocumento) {
  const { documento } = fila;
  return {
    total: deCentavos(documento.totalCentavos),
    retenciones: deCentavos(documento.retencionesCentavos),
    retencionesPorPracticar: deCentavos(documento.retencionesPorPracticarCentavos ?? 0),
    saldoPendiente: deCentavos(documento.saldoAlInicioCentavos ?? 0),
    anterioresAlInicio: deCentavos(anterioresAlInicioDe(documento) ?? 0),
    saldo: deCentavos(saldoDe(documento, aplicadoDe(fila)).disponibleCentavos),
  };
}

/** Qué documento es y de quién: proveedor, tipo, serie, número, referencia y fechas. */
function identificacionDe({ documento, libro }: FilaDeDocumento) {
  return {
    id: documento.id,
    proveedorId: documento.proveedorId,
    proveedorNombre: libro.proveedorNombre,
    proveedorNit: libro.proveedorNit,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: documento.numero,
    referencia: documento.referencia,
    fechaEmision: documento.fechaEmision,
    vencimiento: documento.vencimiento,
  };
}

/** Las notas posteriores como las ve la ventana: el saldo a favor en quetzales. */
function dtoDeNotasPosteriores(notas: NotasPosteriores): SaldoInicialDto['notasPosteriores'] {
  const { saldoLibreCentavos, ...cuentas } = notas;
  return { ...cuentas, saldoLibre: deCentavos(saldoLibreCentavos) };
}

/** El saldo inicial como lo ve la ventana de Administración. */
export function dtoDeSaldoInicial(
  fila: FilaDeDocumento,
  cargaCerrada: boolean,
  notasPosteriores: NotasPosteriores = SIN_NOTAS_POSTERIORES,
): SaldoInicialDto {
  const { documento } = fila;
  const puede = sePuedeCambiar(fila, cargaCerrada);
  return {
    ...identificacionDe(fila),
    ...montosDe(fila),
    estado: documento.estado,
    tieneActivoFijo: documento.tieneActivoFijo,
    creadoEn: fila.creadoEn,
    notasPosteriores: dtoDeNotasPosteriores(notasPosteriores),
    puedeCorregir: puede,
    puedeEliminar: puede,
  };
}
