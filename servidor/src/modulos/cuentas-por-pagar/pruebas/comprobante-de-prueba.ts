import type { ComprobanteDePagoDto, DocumentoDelComprobanteDto } from '../aplicacion/dto/comprobante-de-pago.dto.js';
import { LEYENDA_DE_CONSTANCIAS, LEYENDA_DEL_COMPROBANTE } from '../dominio/comprobante-de-pago.js';

/** Un documento pagado con una retención de IVA ya constanciada y una de ISR por emitir. */
export function documentoDelComprobante(cambios: Partial<DocumentoDelComprobanteDto> = {}): DocumentoDelComprobanteDto {
  return {
    documentoId: 'documento-1',
    tipo: 'factura',
    serie: 'A',
    numero: '123',
    origen: 'libro_de_compras',
    total: '1120.00',
    retenciones: '120.00',
    notasAplicadas: '0.00',
    retencionDescontada: '120.00',
    constancias: [
      { impuesto: 'iva', monto: '90.00', fecha: '2026-11-10', constanciaNumero: 'C-77', porEmitir: false },
      { impuesto: 'isr', monto: '30.00', fecha: '2026-11-10', constanciaNumero: null, porEmitir: true },
    ],
    pagado: '1000.00',
    cubre: '1120.00',
    saldo: '0.00',
    comprometido: '0.00',
    disponible: '0.00',
    ...cambios,
  };
}

const PAGO_VIGENTE: ComprobanteDePagoDto['pago'] = {
  id: 'pago-1',
  numero: '2026-15',
  forma: 'cheque',
  fecha: '2026-11-18',
  posfechado: false,
  estado: 'vigente',
  anulacion: null,
  referencia: null,
  motivo: null,
  observaciones: null,
};

const TOTALES_DE_LA_PRUEBA = {
  totalPagado: '1000.00',
  totalRetenciones: '120.00',
  totalCubierto: '1120.00',
  totalEnLetras: 'MIL QUETZALES CON 00/100',
};

/** Un comprobante de pago con cheque, con una contraseña y un documento; `cambios` pisa lo que haga falta. */
export function comprobanteDePrueba(cambios: Partial<ComprobanteDePagoDto> = {}): ComprobanteDePagoDto {
  return {
    titulo: 'Comprobante de pago con cheque',
    esReciboDeEfectivo: false,
    hojas: ['Original', 'Copia'],
    empresa: { nombre: 'Rancho Ñandú', nit: '1234567-8', razonSocial: 'Rancho Ñandú, S. A.', nombreComercial: null },
    proveedor: { id: 'proveedor-1', nombre: 'Agroservicios La Peña', nit: '7654321-0' },
    beneficiario: 'Agroservicios La Peña',
    pago: PAGO_VIGENTE,
    medio: { cuentaBancariaNombre: 'Monetaria Q', tipo: 'cheque', numero: 1523 },
    retiro: null,
    contrasenas: [{ id: 'contrasena-1', numero: 'CT-9', documentos: [documentoDelComprobante()], pagado: '1000.00' }],
    ...TOTALES_DE_LA_PRUEBA,
    leyendas: [LEYENDA_DE_CONSTANCIAS, LEYENDA_DEL_COMPROBANTE],
    firmas: {
      entrega: { rotulo: 'Entregado por (empresa)', nombre: null },
      recibe: { rotulo: 'Recibí conforme (nombre, DPI y firma)', nombre: null },
    },
    ...cambios,
  };
}
