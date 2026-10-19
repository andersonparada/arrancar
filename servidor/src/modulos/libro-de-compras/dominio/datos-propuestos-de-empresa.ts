import type {
  AgenteDeRetencionDeIva,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
  TipoDePersona,
} from './datos-fiscales-de-empresa.js';

/**
 * Lo que se propone para el resto de la sección fiscal. `undefined` es «sin propuesta» (el usuario debe
 * contestar); en `regimenIsr`, `null` es «no aplica».
 */
export interface DatosPropuestosDeEmpresa {
  regimenIsr: RegimenDeIsrDeEmpresa | null | undefined;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean | undefined;
}

const REGIMENES_DE_ISR_DE_PERSONA: Readonly<Record<TipoDePersona, readonly RegimenDeIsrDeEmpresa[]>> = {
  juridica: ['utilidades', 'opcional_simplificado', 'exento'],
  individual: ['utilidades', 'opcional_simplificado'],
};

/** El régimen de ISR que se propone: el escogido si cabe para esa persona, si no el de costumbre. */
function isrPropuesto(
  regimenIva: RegimenDeIva,
  tipoDePersona: TipoDePersona,
  escogido: RegimenDeIsrDeEmpresa | null,
): RegimenDeIsrDeEmpresa | null | undefined {
  if (regimenIva !== 'general' && regimenIva !== 'no_afiliado') return null;
  if (escogido && REGIMENES_DE_ISR_DE_PERSONA[tipoDePersona].includes(escogido)) return escogido;
  if (regimenIva === 'general') return 'utilidades';
  return tipoDePersona === 'juridica' ? 'exento' : undefined;
}

/** Si lleva contabilidad completa: la jurídica sí; la individual según el régimen; `undefined` si hay que preguntar. */
function agenteDeIsrPropuesto(
  regimenIva: RegimenDeIva,
  tipoDePersona: TipoDePersona,
  regimenIsr: RegimenDeIsrDeEmpresa | null | undefined,
): boolean | undefined {
  if (regimenIva === 'contribuyente_agropecuario') return tipoDePersona === 'individual' ? false : undefined;
  if (tipoDePersona === 'juridica') return true;
  if (regimenIva === 'general') return regimenIsr === 'opcional_simplificado' ? undefined : true;
  return false;
}

/**
 * Los valores que se proponen según el régimen de IVA, el tipo de persona y el régimen de ISR escogido (tabla
 * «R1-e resuelto» de `docs/modulos/diseno-datos-libro-de-compras.md`). Proponen y no imponen: lo que la ley exige lo
 * rechaza `problemasFiscalesDeEmpresa`. El agente de IVA lo decide el usuario solo en el régimen general; en los
 * demás solo vale `ninguno`.
 */
export function datosPropuestos(
  regimenIva: RegimenDeIva,
  tipoDePersona: TipoDePersona,
  regimenIsr: RegimenDeIsrDeEmpresa | null = null,
): DatosPropuestosDeEmpresa {
  const isr = isrPropuesto(regimenIva, tipoDePersona, regimenIsr);
  return {
    regimenIsr: isr,
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: agenteDeIsrPropuesto(regimenIva, tipoDePersona, isr),
  };
}
