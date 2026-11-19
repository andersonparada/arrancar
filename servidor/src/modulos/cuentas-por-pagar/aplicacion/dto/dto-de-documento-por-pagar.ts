import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { accionesDelDocumento, type HechosDelDocumento } from '../../dominio/acciones-posibles.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import {
  anterioresAlInicioDe,
  estaVencido,
  saldoDe,
  type AplicadoAlDocumento,
  type SaldoDelDocumento,
} from '../../dominio/saldos.js';
import { estadoDePagoDe, pagadoYComprometido, posfechadosDe } from '../../dominio/pagos.js';
import { claseDe } from '../../dominio/tipos-de-documento.js';
import type { AplicacionConDatos, FilaDeDocumento, NotaDeUnDocumento } from '../puertos/puertos-de-consultas.js';
import { textoONulo } from './ficha-del-documento.dto.js';
import type { EstadoDePagoDto } from './pagos.dto.js';
import type {
  AnulacionDelDocumentoDto,
  AplicacionDelDocumentoDto,
  DocumentoPorPagarDto,
  NotaDelDocumentoDto,
} from './documento-por-pagar.dto.js';

/** Quien opera y qué día es hoy: lo que cambia de un usuario y de un día a otro en la misma fila. */
export interface PuntoDeVista {
  usuarioId: string;
  /** `AAAA-MM-DD`, en la zona horaria de la empresa. */
  hoy: string;
}

type Identificacion = Pick<
  DocumentoPorPagarDto,
  | 'id'
  | 'origen'
  | 'documentoId'
  | 'tipo'
  | 'clase'
  | 'estado'
  | 'proveedorId'
  | 'documentoAfectadoId'
  | 'facturaDelSistemaAnterior'
  | 'tieneActivoFijo'
>;

const identificacionDe = (documento: DocumentoPorPagar): Identificacion => ({
  id: documento.id,
  origen: documento.origen,
  documentoId: documento.documentoId,
  tipo: documento.tipo,
  clase: claseDe(documento.tipo),
  estado: documento.estado,
  proveedorId: documento.proveedorId,
  documentoAfectadoId: documento.documentoAfectadoId,
  facturaDelSistemaAnterior: documento.facturaDelSistemaAnterior,
  tieneActivoFijo: documento.tieneActivoFijo,
});

const origenDe = ({ libro, documento }: FilaDeDocumento) => ({
  proveedorNombre: libro.proveedorNombre,
  serie: documento.serie,
  numero: documento.numero,
  fechaEmision: documento.fechaEmision,
  fechaRecepcion: libro.fechaRecepcion,
  periodo: libro.periodo,
});

/** Lo pagado y lo comprometido (pagos con fecha futura) de un cargo, y cómo va su pago; las notas y lo anulado no se pagan. */
function pagosDe(fila: FilaDeDocumento, saldo: SaldoDelDocumento, hoy: string) {
  const { pagadoCentavos, comprometidoCentavos } = pagadoYComprometido(fila.pagosVigentes, hoy);
  const sePaga = claseDe(fila.documento.tipo) === 'cargo' && fila.documento.estado !== 'anulado';
  const estadoDePago: EstadoDePagoDto = sePaga
    ? estadoDePagoDe({ deudaCentavos: saldo.deudaCentavos, pagadoCentavos, comprometidoCentavos })
    : null;
  return {
    pagado: deCentavos(pagadoCentavos),
    comprometido: deCentavos(comprometidoCentavos),
    ...posfechadosDe(fila.pagosVigentes, hoy),
    estadoDePago,
  };
}

const montosDe = (documento: DocumentoPorPagar, saldo: SaldoDelDocumento) => ({
  total: deCentavos(documento.totalCentavos),
  retenciones: deCentavos(documento.retencionesCentavos),
  neto: deCentavos(saldo.netoCentavos),
  aplicado: deCentavos(saldo.aplicadoCentavos),
  ajustado: deCentavos(saldo.ajustadoCentavos),
  reintegrado: deCentavos(saldo.reintegradoCentavos),
  saldo: deCentavos(saldo.deudaCentavos),
  disponible: deCentavos(saldo.disponibleCentavos),
  saldoAlInicio: textoONulo(documento.saldoAlInicioCentavos),
  retencionesPorPracticar: textoONulo(documento.retencionesPorPracticarCentavos),
  referencia: documento.referencia,
  anterioresAlInicio: textoONulo(anterioresAlInicioDe(documento)),
});

const seguimientoDe = (documento: DocumentoPorPagar, usuarioId: string) => ({
  esPropio: documento.registradoPor === usuarioId || documento.ingresadoPor === usuarioId,
  registradoEn: documento.registradoEn,
  autorizadoEn: documento.autorizadoEn,
  autorizacionPropia: documento.autorizacionPropia,
});

/**
 * Lo que rebajaron las notas, los pagos, los ajustes y los reintegros, tal como viene en la fila. Con `hoy` separa lo
 * comprometido (pagos posfechados) y el saldo trae la deuda; sin él, solo es fiable lo disponible.
 */
export const aplicadoDe = (fila: FilaDeDocumento, hoy?: string): AplicadoAlDocumento => ({
  comprometidoCentavos: hoy === undefined ? 0 : pagadoYComprometido(fila.pagosVigentes, hoy).comprometidoCentavos,
  alCargoCentavos: fila.aplicadoAlCargoCentavos,
  porLaNotaCentavos: fila.aplicadoPorLaNotaCentavos,
  ajustadoCentavos: fila.ajustadoCentavos,
  pagadoCentavos: fila.pagosVigentes.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
  reintegradoCentavos: fila.reintegradoCentavos,
});

/** Lo que se sabe del documento para decidir qué se puede hacer con él. */
const hechosDe = (fila: FilaDeDocumento, saldoCentavos: number): HechosDelDocumento => ({
  origen: fila.documento.origen,
  tipo: fila.documento.tipo,
  estado: fila.documento.estado,
  notasVigentes: fila.notasVigentes,
  notasEnTotal: fila.notasEnTotal,
  saldoLibreCentavos: saldoCentavos,
  saldoDelCargoCentavos: saldoCentavos,
  ajustesVigentes: fila.ajustesVigentes,
  aplicacionesManualesRecibidas: fila.aplicacionesManualesRecibidas,
  enContrasena: fila.contrasena !== null,
  pagosVigentes: fila.pagosVigentes.length,
  reintegrosVigentes: fila.reintegrosVigentes,
});

/** El documento tal como lo ven la bandeja, la lista y la ficha, con sus saldos y lo que se puede hacer con él. */
export function dtoDeDocumentoPorPagar(fila: FilaDeDocumento, vista: PuntoDeVista): DocumentoPorPagarDto {
  const { documento } = fila;
  const saldo = saldoDe(documento, aplicadoDe(fila, vista.hoy));
  return {
    ...identificacionDe(documento),
    ...origenDe(fila),
    ...montosDe(documento, saldo),
    ...pagosDe(fila, saldo, vista.hoy),
    ...seguimientoDe(documento, vista.usuarioId),
    vencimiento: documento.vencimiento,
    vencido: estaVencido(documento, saldo.deudaCentavos, vista.hoy),
    contrasena: fila.contrasena,
    ...accionesDelDocumento(hechosDe(fila, saldo.deudaCentavos)),
  };
}

/** Cómo se anuló el documento; `null` si sigue vigente. */
export function dtoDeAnulacion({ documento, libro }: FilaDeDocumento): AnulacionDelDocumentoDto | null {
  if (documento.estado !== 'anulado') return null;
  const { causa, motivo, anuladoPor, anuladoPorNombre, anuladoEn } = libro.anulacion;
  return { causa, motivo, anuladoPor, anuladoPorNombre, anuladoEn: anuladoEn?.toISOString() ?? null };
}

export function dtoDeNota(nota: NotaDeUnDocumento): NotaDelDocumentoDto {
  const { totalCentavos, aplicadoAlDocumentoCentavos, ...resto } = nota;
  return {
    ...resto,
    total: deCentavos(totalCentavos),
    aplicadoAEsteDocumento: deCentavos(aplicadoAlDocumentoCentavos),
  };
}

export function dtoDeAplicacion({ montoCentavos, ...resto }: AplicacionConDatos): AplicacionDelDocumentoDto {
  return { ...resto, puedeQuitar: resto.forma === 'manual', monto: deCentavos(montoCentavos) };
}
