import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FichaDeDocumento } from '../../servicios/documentos.api';
import type { DocumentoQueModifica, FacturaAnteriorDeLaFicha } from '../../servicios/facturas-anteriores.api';
import { MOTIVOS_CORTOS } from '../../textos-del-libro';
import { tituloDeDocumento } from './detalles-de-documento';

/** «Factura A-123 del 05/01/2026»; si es del sistema anterior lo dice al final. */
export function textoDelDocumentoQueModifica(documento: DocumentoQueModifica): string {
  const texto = `${tituloDeDocumento(documento)} del ${formatearFecha(documento.fechaEmision)}`;
  return documento.origen === 'sistema_anterior' ? `${texto} (del sistema anterior)` : texto;
}

const hayMonto = (monto: string): boolean => Number(monto) !== 0;

/** Si dio crédito fiscal y, si no, por qué (el motivo de familia sin IVA también se nombra). */
export function textoDelCredito(factura: Pick<FacturaAnteriorDeLaFicha, 'motivoSinCredito'>): string {
  const { motivoSinCredito } = factura;
  if (!motivoSinCredito) return 'Sí dio crédito fiscal';
  const motivos = MOTIVOS_CORTOS as Record<string, string>;
  return `No dio crédito fiscal: ${motivos[motivoSinCredito] ?? motivoSinCredito}`;
}

/** Los datos de la factura del sistema anterior para la ficha de la nota; lo que no se llenó se omite. */
export function detallesDeLaFacturaAnterior(factura: FacturaAnteriorDeLaFicha): DetalleDeRegistro[] {
  const debitos = hayMonto(factura.notasDeDebitoAnterioresTotal)
    ? `${formatearMonto(factura.notasDeDebitoAnterioresTotal)} (IVA ${formatearMonto(factura.notasDeDebitoAnterioresIva)})`
    : null;
  const detalles: [string, string | null][] = [
    ['Total', formatearMonto(factura.total)],
    ['IVA', formatearMonto(factura.iva)],
    ['Crédito fiscal', textoDelCredito(factura)],
    ['Detalle de la causa', factura.detalleDelMotivo],
    ['Notas de débito del sistema anterior', debitos],
    ['Autorización FEL', factura.autorizacionFel],
  ];
  return detalles.filter(([, valor]) => valor).map(([etiqueta, valor]) => ({ etiqueta, valor: valor as string }));
}

/** Lo que la ficha muestra de la factura que corrige la nota; `null` si el documento no es una nota. */
export function datosDelDocumentoQueModifica(
  ficha: Pick<FichaDeDocumento, 'documentoQueModifica' | 'facturaAnterior'>,
) {
  const documento = ficha.documentoQueModifica;
  if (!documento) return null;
  return {
    texto: textoDelDocumentoQueModifica(documento),
    documentoId: documento.origen === 'libro' ? documento.documentoId : null,
    detalles: ficha.facturaAnterior ? detallesDeLaFacturaAnterior(ficha.facturaAnterior) : [],
  };
}
