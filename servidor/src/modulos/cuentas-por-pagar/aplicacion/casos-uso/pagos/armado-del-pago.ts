import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { efectoDelPago } from '../../../dominio/anulacion-de-pagos.js';
import { PagoRegistrado, type AplicacionDelEvento } from '../../../dominio/eventos-de-pagos.js';
import { numeroDelPago, type EstadoDeUnPago, type FormaDePago } from '../../../dominio/pagos.js';
import type { DiferenciaPedida } from '../../../dominio/registro-de-pago.js';
import type { AplicacionDelPagoDto, PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import type { LineaConRetencion } from './avisos-del-pago.js';

/** Lo que hace falta para armar la respuesta de un pago, recién registrado o ya guardado (anulado o reaplicado). */
export interface PagoParaElDto {
  pagoId: string;
  numero: { numero: number; anio: number };
  forma: FormaDePago;
  observaciones: string | null;
  motivo: string | null;
  conCargaCerrada: boolean | null;
  /** Solo en efectivo: el retiro, quien recibió por el proveedor y por qué se usó la excepción de bancarización. */
  retiroId: string | null;
  recibidoPor: string | null;
  motivoSinBancarizar: string | null;
  fecha: string;
  hoy: string;
  beneficiario: string;
  /** El cheque o la nota de Bancos; nulo si el pago no lo tiene (cuenta de apertura, efectivo). */
  movimiento: MovimientoCreado | null;
  lineas: readonly LineaConRetencion[];
  diferencias: readonly DiferenciaPedida[];
  avisos: string[];
  estado: EstadoDeUnPago;
  /** Solo en un pago anulado: la fecha contable y el motivo. */
  anulacion: { fecha: string; motivo: string } | null;
}

/** Todo lo que el pago ya tiene resuelto al terminar de guardarse. */
export interface PagoGuardado extends PagoParaElDto {
  empresaId: string;
  cuentaId: string;
  /** Quien registró el pago. */
  usuarioId: string;
  /** Se pagó en efectivo sobre el umbral con la excepción de bancarización (Contabilidad lo marca sin deducción ni crédito). */
  sinBancarizar: boolean;
}

const sumaDe = (lineas: readonly LineaConRetencion[]): number =>
  lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

function dtoDeLaLinea(linea: LineaConRetencion): AplicacionDelPagoDto {
  const { documento } = linea.fila;
  return {
    documentoId: documento.id,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: documento.numero,
    origen: documento.origen,
    total: deCentavos(documento.totalCentavos),
    retenciones: deCentavos(documento.retencionesCentavos),
    contrasena: linea.contrasena,
    retencionDescontada: deCentavos(linea.retencionDescontadaCentavos),
    monto: deCentavos(linea.montoCentavos),
    cubre: deCentavos(linea.montoCentavos + linea.retencionDescontadaCentavos),
  };
}

const dtoDelMovimiento = ({ movimientoId, cuentaBancariaId, numero }: MovimientoCreado) => ({
  id: movimientoId,
  cuentaBancariaId,
  numero,
});

const sumaDeLaForma = (pago: PagoParaElDto) => deCentavos(sumaDe(pago.lineas));

/** Lo que solo lleva el efectivo: su retiro, quien recibió y el motivo de la excepción de bancarización. */
export const datosDelEfectivo = ({
  retiroId,
  recibidoPor,
  motivoSinBancarizar,
}: Pick<PagoParaElDto, 'retiroId' | 'recibidoPor' | 'motivoSinBancarizar'>) => ({
  retiroId,
  recibidoPor,
  motivoSinBancarizar,
});

/** El pago como lo ve la pantalla justo después de registrarlo. */
export function dtoDelPago(pago: PagoParaElDto): PagoDto {
  const { fila } = pago.lineas[0]!;
  const contrasenas = new Map(pago.lineas.map(({ contrasena }) => [contrasena.id, contrasena]));
  return {
    id: pago.pagoId,
    numero: numeroDelPago(pago.numero.numero, pago.numero.anio),
    contrasenas: [...contrasenas.values()],
    proveedor: { id: fila.documento.proveedorId, nombre: fila.libro.proveedorNombre, nit: fila.libro.proveedorNit },
    beneficiario: pago.beneficiario,
    forma: pago.forma,
    fecha: pago.fecha,
    posfechado: pago.estado === 'vigente' && pago.fecha > pago.hoy,
    monto: sumaDeLaForma(pago),
    movimiento: pago.movimiento ? dtoDelMovimiento(pago.movimiento) : null,
    observaciones: pago.observaciones,
    motivo: pago.motivo,
    conCargaCerrada: pago.conCargaCerrada,
    ...datosDelEfectivo(pago),
    estado: pago.estado,
    anulacion: pago.anulacion,
    aplicaciones: pago.lineas.map(dtoDeLaLinea),
    diferencias: pago.diferencias.map(({ cargoId, montoCentavos }) => ({ cargoId, monto: deCentavos(montoCentavos) })),
    avisos: pago.avisos,
  };
}

export const aplicacionDelEvento = ({
  fila: { documento },
  montoCentavos,
  retencionDescontadaCentavos,
}: LineaConRetencion): AplicacionDelEvento => ({
  documentoId: documento.id,
  documentoDeCompraId: documento.documentoId,
  origen: documento.origen,
  montoCentavos,
  retencionDescontadaCentavos,
  tieneActivoFijo: documento.tieneActivoFijo,
});

/** El evento para Contabilidad: la partida va con la fecha del cheque contra la cuenta del banco (en la nota ligada, contra la transitoria). */
export function eventoDelPago(pago: PagoGuardado): PagoRegistrado {
  const { fila } = pago.lineas[0]!;
  return new PagoRegistrado({
    empresaId: pago.empresaId,
    cuentaId: pago.cuentaId,
    usuarioId: pago.usuarioId,
    pagoId: pago.pagoId,
    numero: pago.numero.numero,
    contrasenaIds: [...new Set(pago.lineas.map(({ contrasena }) => contrasena.id))],
    proveedorId: fila.documento.proveedorId,
    forma: pago.forma,
    fecha: pago.fecha,
    posfechado: pago.fecha > pago.hoy,
    montoCentavos: sumaDe(pago.lineas),
    movimientoId: pago.movimiento?.movimientoId ?? null,
    cuentaBancariaId: pago.movimiento?.cuentaBancariaId ?? null,
    retiroId: pago.retiroId,
    sinBancarizar: pago.sinBancarizar,
    efecto: efectoDelPago({ forma: pago.forma, conCargaCerrada: pago.conCargaCerrada }),
    aplicaciones: pago.lineas.map(aplicacionDelEvento),
  });
}
