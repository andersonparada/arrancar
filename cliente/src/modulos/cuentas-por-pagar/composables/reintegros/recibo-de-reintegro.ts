import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { ReciboDeReintegro } from '../../servicios/tipos-de-reintegros';

/** Cómo se cobró, tal como se lee en el recibo: el depósito con su cuenta y boleta; el efectivo con su referencia. */
export function descripcionDelMedio(
  recibo: Pick<ReciboDeReintegro, 'forma' | 'cuentaBancaria' | 'referencia'>,
): string {
  if (recibo.forma === 'efectivo') {
    return recibo.referencia ? `Efectivo. Recibo de caja o boleta: ${recibo.referencia}` : 'Efectivo';
  }
  const cuenta = recibo.cuentaBancaria ? ` en ${recibo.cuentaBancaria}` : '';
  return recibo.referencia ? `Depósito${cuenta}. Boleta: ${recibo.referencia}` : `Depósito${cuenta}`;
}

/** El nombre que sugiere el navegador al guardar en PDF. */
export const tituloDelRecibo = (recibo: Pick<ReciboDeReintegro, 'numero' | 'fecha'>): string =>
  `Recibo de reintegro ${recibo.numero} - ${formatearFecha(recibo.fecha)}`;

/** La razón social si la hay (o el nombre) y, aparte, el nombre comercial solo si es distinto. */
export function lineasDeLaEmpresa(empresa: ReciboDeReintegro['empresa']): {
  principal: string;
  comercial: string | null;
} {
  const principal = empresa.razonSocial || empresa.nombre;
  const comercial = empresa.nombreComercial && empresa.nombreComercial !== principal ? empresa.nombreComercial : null;
  return { principal, comercial };
}

/** La nota de crédito como se lee: «A-45» o «45». */
export const etiquetaDeLaNota = (nota: { serie: string | null; numero: string }): string =>
  nota.serie ? `${nota.serie}-${nota.numero}` : nota.numero;
