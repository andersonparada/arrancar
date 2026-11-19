import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Anticipo } from '../../servicios/tipos-de-anticipos';
import type { Gasto } from '../../servicios/tipos-de-gastos';
import { centavosDelServidor, textoDeCentavos } from '../dinero';

/** Los gastos de la hoja, separados: con documento (deducibles) y sin documento (no sustentados). */
export function separarLosGastos(gastos: readonly Gasto[]): { conDocumento: Gasto[]; sinDocumento: Gasto[] } {
  const vigentes = gastos.filter(({ estado }) => estado === 'vigente');
  return {
    conDocumento: vigentes.filter(({ clase }) => clase === 'documento'),
    sinDocumento: vigentes.filter(({ clase }) => clase === 'sin_documento'),
  };
}

/** Lo que suman los gastos al anticipo (una nota de crédito resta), como texto con dos decimales. */
export const sumaDeLosGastos = (gastos: readonly Gasto[]): string =>
  textoDeCentavos(gastos.reduce((suma, gasto) => suma + (gasto.resta ? -1 : 1) * centavosDelServidor(gasto.monto), 0));

/** Cada cifra de la liquidación que tuvo valor, con su nombre, para el cuadro de la hoja. */
export function cuadroDeLaLiquidacion(anticipo: Anticipo): { etiqueta: string; valor: string }[] {
  const cuadro = [
    { etiqueta: 'Anticipo entregado', valor: formatearMonto(anticipo.monto) },
    { etiqueta: 'Gastos justificados', valor: formatearMonto(anticipo.gastado) },
  ];
  const { liquidacion } = anticipo;
  if (!liquidacion) return cuadro;
  if (liquidacion.devuelto !== '0.00')
    cuadro.push({ etiqueta: 'Devuelto a la empresa', valor: formatearMonto(liquidacion.devuelto) });
  if (liquidacion.reembolsado !== '0.00') {
    cuadro.push({ etiqueta: 'Reembolsado al beneficiario', valor: formatearMonto(liquidacion.reembolsado) });
  }
  if (liquidacion.noLiquidado !== '0.00')
    cuadro.push({ etiqueta: 'Sin liquidar', valor: formatearMonto(liquidacion.noLiquidado) });
  return cuadro;
}

/**
 * La línea de firma de la autorización del descuento en cuotas, solo cuando lo no liquidado se cobra. El texto legal exacto
 * está por validar con el contador (diseño, V-13): aquí solo se dice qué se autoriza.
 */
export function autorizacionDelDescuento(anticipo: Pick<Anticipo, 'liquidacion' | 'beneficiario'>): string | null {
  const { liquidacion } = anticipo;
  if (!liquidacion || liquidacion.destinoDeNoLiquidado !== 'cobrar' || !liquidacion.cuotas) return null;
  return (
    `Yo, ${anticipo.beneficiario}, autorizo que se me cobre ${formatearMonto(liquidacion.noLiquidado)} en ` +
    `${liquidacion.cuotas} cuotas por lo que no justifiqué de este anticipo.`
  );
}
