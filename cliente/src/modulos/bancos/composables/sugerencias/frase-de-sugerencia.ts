import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { BaseDeSugerencia, OpcionSugerida } from '../../servicios/sugerencias.api';

/** «85 %»: qué parte de los casos parecidos usó ese concepto, descontando cuando hay pocos. */
export const textoDeConfianza = (confianza: number): string => `${confianza} %`;

/** «Planilla · 85 %»: lo que dice la insignia y el botón de una opción. */
export const rotuloDeOpcion = (opcion: Pick<OpcionSugerida, 'conceptoNombre' | 'confianza'>): string =>
  `${opcion.conceptoNombre} · ${textoDeConfianza(opcion.confianza)}`;

const DE_QUE_MOVIMIENTOS: Record<BaseDeSugerencia, (parecido: string | null) => string> = {
  mismo_beneficiario: () => 'de este beneficiario',
  beneficiario_parecido: (parecido) => `de un beneficiario parecido${parecido ? ` («${parecido}»)` : ''}`,
  misma_cuenta_sin_beneficiario: () => 'sin beneficiario de esta misma cuenta',
};

/**
 * El «por qué» en una frase, por ejemplo «4 de 5 movimientos de este beneficiario, de Q150.00 a Q1,200.00; el último
 * el 12/08/2026». `casosComparados` es el total de casos que votaron (por todos los conceptos).
 */
export function fraseDeSugerencia(opcion: OpcionSugerida, casosComparados: number): string {
  const { base, casos, ultimaFecha, montoMinimo, montoMaximo, beneficiarioParecido } = opcion.porque;
  const total = Math.max(casosComparados, casos);
  const movimientos = total === 1 ? 'movimiento' : 'movimientos';
  const rango =
    montoMinimo === montoMaximo
      ? `de ${formatearMonto(montoMinimo)}`
      : `de ${formatearMonto(montoMinimo)} a ${formatearMonto(montoMaximo)}`;
  const origen = DE_QUE_MOVIMIENTOS[base](beneficiarioParecido);
  return `${casos} de ${total} ${movimientos} ${origen}, ${rango}; el último el ${formatearFecha(ultimaFecha)}.`;
}
