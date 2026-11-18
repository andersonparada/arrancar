import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { montoEnLetras } from '../../../core/compartido/dominio/monto-en-letras.js';
import {
  esReciboDeEfectivo,
  leyendasDelComprobante,
  rotulosDeFirmas,
  tituloDelComprobante,
} from '../../dominio/comprobante-de-pago.js';
import type { EmpresaDeLaImpresion } from '../puertos/puertos-de-impresion-de-contrasenas.js';
import type {
  ComprobanteDePagoDto,
  ContrasenaDelComprobanteDto,
  DocumentoDelComprobanteDto,
} from './comprobante-de-pago.dto.js';
import type { AplicacionDeLaFichaDto, FichaDePagoDto } from './ficha-de-pago.dto.js';

/** Un documento en la hoja; las constancias solo salen donde este pago descuenta la retención. */
function dtoDelDocumento(linea: AplicacionDeLaFichaDto): DocumentoDelComprobanteDto {
  const descuenta = aCentavos(linea.retencionDescontada) > 0;
  return {
    documentoId: linea.documentoId,
    tipo: linea.tipo,
    serie: linea.serie,
    numero: linea.numero,
    origen: linea.origen,
    total: linea.total,
    retenciones: linea.retenciones,
    notasAplicadas: linea.notasAplicadas,
    retencionDescontada: linea.retencionDescontada,
    constancias: descuenta ? linea.retencionesDelLibro : [],
    pagado: linea.monto,
    cubre: linea.cubre,
    saldo: linea.saldoDelDocumento,
    comprometido: deCentavos(aCentavos(linea.saldoDelDocumento) - aCentavos(linea.disponibleDelDocumento)),
    disponible: linea.disponibleDelDocumento,
  };
}

const sumaDe = (montos: readonly string[]): number => montos.reduce((suma, monto) => suma + aCentavos(monto), 0);

/** Las líneas de la ficha, ya juntas por contraseña, en las hojas del comprobante. */
function contrasenasDelComprobante(aplicaciones: readonly AplicacionDeLaFichaDto[]): ContrasenaDelComprobanteDto[] {
  const hojas: ContrasenaDelComprobanteDto[] = [];
  for (const linea of aplicaciones) {
    const hoja = hojas.find(({ id }) => id === linea.contrasena.id) ?? {
      ...linea.contrasena,
      documentos: [],
      pagado: '',
    };
    if (!hojas.includes(hoja)) hojas.push(hoja);
    hoja.documentos.push(dtoDelDocumento(linea));
    hoja.pagado = deCentavos(sumaDe(hoja.documentos.map(({ pagado }) => pagado)));
  }
  return hojas;
}

const datosDelPago = (ficha: FichaDePagoDto): ComprobanteDePagoDto['pago'] => ({
  id: ficha.id,
  numero: ficha.numero,
  forma: ficha.forma,
  fecha: ficha.fecha,
  posfechado: ficha.posfechado,
  estado: ficha.estado,
  anulacion: ficha.anulacion,
  referencia: ficha.referencia,
  motivo: ficha.motivo,
  observaciones: ficha.observaciones,
});

function totalesDelComprobante(ficha: FichaDePagoDto) {
  const pagado = sumaDe(ficha.aplicaciones.map(({ monto }) => monto));
  const retenciones = sumaDe(ficha.aplicaciones.map(({ retencionDescontada }) => retencionDescontada));
  return {
    totalPagado: deCentavos(pagado),
    totalRetenciones: deCentavos(retenciones),
    totalCubierto: deCentavos(pagado + retenciones),
    totalEnLetras: montoEnLetras(pagado),
  };
}

function firmasDelComprobante(ficha: FichaDePagoDto): ComprobanteDePagoDto['firmas'] {
  const rotulos = rotulosDeFirmas(ficha.forma);
  return {
    entrega: { rotulo: rotulos.entrega, nombre: ficha.retiro?.custodio ?? null },
    recibe: { rotulo: rotulos.recibe, nombre: ficha.recibidoPor },
  };
}

/**
 * El comprobante de un pago a partir de su ficha: lo que el proveedor recibe y firma. Con la forma `efectivo` es el
 * «Recibo de pago en efectivo» con el retiro y el custodio que entrega. Nunca es un documento tributario.
 */
export function dtoDelComprobante(ficha: FichaDePagoDto, empresa: EmpresaDeLaImpresion): ComprobanteDePagoDto {
  const { movimiento, retiro } = ficha;
  return {
    titulo: tituloDelComprobante(ficha.forma),
    esReciboDeEfectivo: esReciboDeEfectivo(ficha.forma),
    hojas: ['Original', 'Copia'],
    empresa,
    proveedor: ficha.proveedor,
    beneficiario: ficha.beneficiario,
    pago: datosDelPago(ficha),
    medio: movimiento && {
      cuentaBancariaNombre: movimiento.cuentaBancariaNombre,
      tipo: movimiento.tipo,
      numero: movimiento.numero,
    },
    retiro: retiro && { numero: retiro.numero, custodio: retiro.custodio },
    contrasenas: contrasenasDelComprobante(ficha.aplicaciones),
    ...totalesDelComprobante(ficha),
    leyendas: leyendasDelComprobante(ficha.forma),
    firmas: firmasDelComprobante(ficha),
  };
}
