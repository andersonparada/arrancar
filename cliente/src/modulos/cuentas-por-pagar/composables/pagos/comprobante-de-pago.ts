import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ComprobanteDePago, DocumentoDelComprobante, RetencionDeLaLinea } from '../../servicios/tipos-de-pagos';
import { centavosDe } from '../dinero';

const NOMBRES_DE_IMPUESTO = { iva: 'IVA', isr: 'ISR' } as const;

/** Las constancias como se leen: «IVA Q120.00 · constancia 123» o «… · constancia por emitir». */
export function textoDeRetenciones(retenciones: readonly RetencionDeLaLinea[]): string[] {
  return retenciones.map(
    (retencion) =>
      `${NOMBRES_DE_IMPUESTO[retencion.impuesto]} ${formatearMonto(retencion.monto)} · ` +
      (retencion.porEmitir || !retencion.constanciaNumero
        ? 'constancia por emitir'
        : `constancia ${retencion.constanciaNumero}`),
  );
}

const NOMBRES_DE_TIPO_DE_MEDIO: Record<string, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_de_credito: 'Nota de crédito',
};

/** El cheque o la nota de Bancos: «Cheque 1523 · Cuenta monetaria». */
export function textoDelMedio(medio: NonNullable<ComprobanteDePago['medio']>): string {
  const tipo = NOMBRES_DE_TIPO_DE_MEDIO[medio.tipo] ?? medio.tipo;
  return `${tipo} ${medio.numero} · ${medio.cuentaBancariaNombre}`;
}

/** «Cheque posfechado al 20/12/2026» si el pago está comprometido; `null` si no. */
export const leyendaDePosfechado = (pago: Pick<ComprobanteDePago['pago'], 'posfechado' | 'fecha'>): string | null =>
  pago.posfechado ? `Cheque posfechado al ${formatearFecha(pago.fecha)}` : null;

/** El nombre sugerido del PDF al guardar: «Pago 2026-15 - Agro». */
export const tituloDelPapelDelPago = (comprobante: Pick<ComprobanteDePago, 'pago' | 'proveedor'>): string =>
  `Pago ${comprobante.pago.numero} - ${comprobante.proveedor.nombre}`;

/** Si alguna nota de crédito rebajó el documento (la columna se llena solo entonces). */
export function hayNotasAplicadas(documento: Pick<DocumentoDelComprobante, 'notasAplicadas'>): boolean {
  return (centavosDe(documento.notasAplicadas) ?? 0) > 0;
}

/** Razón social si la hay (o el nombre) y, aparte, el nombre comercial solo si es distinto. */
export function lineasDeLaEmpresa(empresa: ComprobanteDePago['empresa']): {
  principal: string;
  comercial: string | null;
} {
  const principal = empresa.razonSocial || empresa.nombre;
  const comercial = empresa.nombreComercial && empresa.nombreComercial !== principal ? empresa.nombreComercial : null;
  return { principal, comercial };
}
