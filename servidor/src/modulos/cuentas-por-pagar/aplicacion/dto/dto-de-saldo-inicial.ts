import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDeSaldoInicial } from '../../dominio/saldo-inicial.js';
import { anterioresAlInicioDe, saldoDe } from '../../dominio/saldos.js';
import type { FilaDeDocumento } from '../puertos/puertos-de-consultas.js';
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

/** Se puede corregir o eliminar con la carga abierta, completado y sin notas aplicadas (las demás reglas, las de dominio). */
function sePuedeCambiar(fila: FilaDeDocumento, cargaCerrada: boolean): boolean {
  const sinMovimientos = fila.aplicadoAlCargoCentavos === 0 && fila.aplicadoPorLaNotaCentavos === 0;
  return !cargaCerrada && fila.documento.estado === 'registrado' && sinMovimientos;
}

/** Los montos de la ficha: lo cargado, lo anterior al corte y lo que se debe hoy. */
function montosDe(fila: FilaDeDocumento) {
  const { documento } = fila;
  const aplicado = { alCargoCentavos: fila.aplicadoAlCargoCentavos, porLaNotaCentavos: fila.aplicadoPorLaNotaCentavos };
  return {
    total: deCentavos(documento.totalCentavos),
    retenciones: deCentavos(documento.retencionesCentavos),
    retencionesPorPracticar: deCentavos(documento.retencionesPorPracticarCentavos ?? 0),
    saldoPendiente: deCentavos(documento.saldoAlInicioCentavos ?? 0),
    anterioresAlInicio: deCentavos(anterioresAlInicioDe(documento) ?? 0),
    saldo: deCentavos(saldoDe(documento, aplicado).saldoCentavos),
  };
}

/** El saldo inicial como lo ve la ventana de Administración. */
export function dtoDeSaldoInicial(fila: FilaDeDocumento, cargaCerrada: boolean): SaldoInicialDto {
  const { documento, libro } = fila;
  const puede = sePuedeCambiar(fila, cargaCerrada);
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
    ...montosDe(fila),
    estado: documento.estado,
    tieneActivoFijo: documento.tieneActivoFijo,
    creadoEn: fila.creadoEn,
    puedeCorregir: puede,
    puedeEliminar: puede,
  };
}
