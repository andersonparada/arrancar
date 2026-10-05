import { EstrategiaDeIsrOpcionalSimplificado } from './estrategia-de-retencion-de-isr.js';
import {
  EstrategiaDeAgenteGeneral,
  EstrategiaDeExportador,
  EstrategiaDePequenoContribuyente,
  EstrategiaDeSectorPublico,
} from './estrategias-de-retencion-de-iva.js';
import type { EntradaDeRetenciones, EstrategiaDeRetencion, RetencionPropuesta } from './retencion-propuesta.js';

const ESTRATEGIAS: readonly EstrategiaDeRetencion[] = [
  new EstrategiaDeExportador(),
  new EstrategiaDeAgenteGeneral(
    'contribuyente_especial',
    'iva_contribuyente_especial',
    (config) => config.porcentajeContribuyenteEspecial,
  ),
  new EstrategiaDeAgenteGeneral('otro', 'iva_otro_agente', (config) => config.porcentajeOtroAgente),
  new EstrategiaDeSectorPublico(),
  new EstrategiaDePequenoContribuyente(),
  new EstrategiaDeIsrOpcionalSimplificado(),
];

/**
 * Las retenciones que se proponen al registrar un documento (§4.3 del diseño): ninguna si la casilla
 * «Se muestra en reportes SAT» está desmarcada (riesgo aceptado) ni en una nota de crédito; si no, lo que
 * propongan las estrategias. No depende del motivo sin crédito fiscal: un IVA al costo también se retiene.
 * Se fijan al registrar; nada las recalcula después.
 */
export function calcularRetenciones(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
  if (!entrada.muestraEnReportesSat || entrada.tipo === 'nota_de_credito') return [];
  return ESTRATEGIAS.flatMap((estrategia) => estrategia.proponer(entrada));
}
