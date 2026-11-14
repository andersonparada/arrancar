import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDeFacturaAnterior } from '../../dominio/factura-anterior.js';
import type { MotivoSinCredito, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** La factura del sistema anterior que corrige una nota, tal como la ve la pantalla (dinero como texto). */
export interface FacturaAnteriorDto {
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  autorizacionFel: string | null;
  total: string;
  iva: string;
  notasDeDebitoAnterioresTotal: string;
  notasDeDebitoAnterioresIva: string;
  motivoSinCredito: MotivoSinCredito | null;
  detalleDelMotivo: string | null;
}

export function dtoDeFacturaAnterior(factura: DatosDeFacturaAnterior): FacturaAnteriorDto {
  return {
    tipo: factura.tipo,
    serie: factura.serie,
    numero: factura.numero,
    fechaEmision: factura.fechaEmision,
    autorizacionFel: factura.autorizacionFel,
    total: deCentavos(factura.total),
    iva: deCentavos(factura.iva),
    notasDeDebitoAnterioresTotal: deCentavos(factura.notasDeDebitoAnterioresTotal),
    notasDeDebitoAnterioresIva: deCentavos(factura.notasDeDebitoAnterioresIva),
    motivoSinCredito: factura.motivoSinCredito,
    detalleDelMotivo: factura.detalleDelMotivo,
  };
}
