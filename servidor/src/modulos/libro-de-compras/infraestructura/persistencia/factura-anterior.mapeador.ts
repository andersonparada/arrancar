import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { FacturaAnterior } from '../../dominio/factura-anterior.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import type { facturasAnteriores } from './facturas-anteriores.tablas.js';

type FilaDeFacturaAnterior = typeof facturasAnteriores.$inferSelect;

export const mapeadorDeFacturaAnterior = {
  aDominio(fila: FilaDeFacturaAnterior): FacturaAnterior {
    return {
      id: fila.id,
      proveedorId: fila.proveedorId,
      tipo: fila.tipo,
      serie: fila.serie,
      numero: fila.numero,
      autorizacionFel: fila.autorizacionFel,
      fechaEmision: fila.fechaEmision,
      total: aCentavos(fila.total),
      iva: aCentavos(fila.iva),
      notasDeDebitoAnterioresTotal: aCentavos(fila.notasDeDebitoAnterioresTotal),
      notasDeDebitoAnterioresIva: aCentavos(fila.notasDeDebitoAnterioresIva),
      motivoSinCredito: fila.motivoSinCredito as MotivoSinCredito | null,
      detalleDelMotivo: fila.detalleDelMotivo,
    };
  },

  /** Las columnas que cambian al insertar o corregir (sin empresa, cuenta ni marcas, que pone la base). */
  aColumnas(factura: FacturaAnterior) {
    return {
      proveedorId: factura.proveedorId,
      tipo: factura.tipo,
      serie: factura.serie,
      numero: factura.numero,
      autorizacionFel: factura.autorizacionFel,
      fechaEmision: factura.fechaEmision,
      total: deCentavos(factura.total),
      iva: deCentavos(factura.iva),
      notasDeDebitoAnterioresTotal: deCentavos(factura.notasDeDebitoAnterioresTotal),
      notasDeDebitoAnterioresIva: deCentavos(factura.notasDeDebitoAnterioresIva),
      motivoSinCredito: factura.motivoSinCredito,
      detalleDelMotivo: factura.detalleDelMotivo,
    };
  },
};
