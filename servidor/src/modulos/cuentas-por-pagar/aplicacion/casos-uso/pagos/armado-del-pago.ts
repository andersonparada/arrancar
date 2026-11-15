import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { PagoRegistrado, type AplicacionDelEvento } from '../../../dominio/eventos-de-pagos.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import type { DiferenciaPedida } from '../../../dominio/registro-de-pago.js';
import type { AplicacionDelPagoDto, PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import type { LineaConRetencion } from './avisos-del-pago.js';
import type { PeticionDePago } from './peticion-de-pago.js';

/** Todo lo que el pago ya tiene resuelto al terminar de guardarse. */
export interface PagoGuardado {
  empresaId: string;
  pagoId: string;
  numero: { numero: number; anio: number };
  pedido: PeticionDePago;
  fecha: string;
  hoy: string;
  beneficiario: string;
  movimiento: MovimientoCreado;
  lineas: readonly LineaConRetencion[];
  diferencias: readonly DiferenciaPedida[];
  avisos: string[];
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

/** El pago como lo ve la pantalla justo después de registrarlo. */
export function dtoDelPago(pago: PagoGuardado): PagoDto {
  const { fila } = pago.lineas[0]!;
  const contrasenas = new Map(pago.lineas.map(({ contrasena }) => [contrasena.id, contrasena]));
  return {
    id: pago.pagoId,
    numero: numeroDelPago(pago.numero.numero, pago.numero.anio),
    contrasenas: [...contrasenas.values()],
    proveedor: { id: fila.documento.proveedorId, nombre: fila.libro.proveedorNombre, nit: fila.libro.proveedorNit },
    beneficiario: pago.beneficiario,
    forma: pago.pedido.forma,
    fecha: pago.fecha,
    posfechado: pago.fecha > pago.hoy,
    monto: deCentavos(sumaDe(pago.lineas)),
    movimiento: dtoDelMovimiento(pago.movimiento),
    observaciones: pago.pedido.observaciones ?? null,
    estado: 'vigente',
    aplicaciones: pago.lineas.map(dtoDeLaLinea),
    diferencias: pago.diferencias.map(({ cargoId, montoCentavos }) => ({ cargoId, monto: deCentavos(montoCentavos) })),
    avisos: pago.avisos,
  };
}

const aplicacionDelEvento = ({
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

/** El evento para Contabilidad: la partida va con la fecha del cheque contra la cuenta del banco. */
export function eventoDelPago(pago: PagoGuardado): PagoRegistrado {
  const { fila } = pago.lineas[0]!;
  return new PagoRegistrado({
    empresaId: pago.empresaId,
    pagoId: pago.pagoId,
    numero: pago.numero.numero,
    contrasenaIds: [...new Set(pago.lineas.map(({ contrasena }) => contrasena.id))],
    proveedorId: fila.documento.proveedorId,
    forma: pago.pedido.forma,
    fecha: pago.fecha,
    posfechado: pago.fecha > pago.hoy,
    montoCentavos: sumaDe(pago.lineas),
    movimientoId: pago.movimiento.movimientoId,
    cuentaBancariaId: pago.movimiento.cuentaBancariaId,
    retiroId: null,
    sinBancarizar: false,
    efecto: 'banco',
    aplicaciones: pago.lineas.map(aplicacionDelEvento),
  });
}
