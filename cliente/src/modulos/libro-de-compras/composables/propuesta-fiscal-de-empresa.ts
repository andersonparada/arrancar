import type {
  AgenteDeRetencionDeIva,
  RegimenDeIsrDeEmpresa,
  RegimenDeIva,
  TipoDePersona,
} from '../servicios/libro-de-compras.api';

/**
 * Lo que se propone para el resto de la sección. `undefined` es «sin propuesta» (el usuario debe contestar); en
 * `regimenIsr`, `null` es «no aplica».
 */
export interface PropuestaFiscalDeEmpresa {
  regimenIsr: RegimenDeIsrDeEmpresa | null | undefined;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean | undefined;
}

/** Réplica de la tabla del servidor (`datosPropuestos`): qué régimen de ISR cabe para cada persona. */
const ISR_DE_PERSONA: Readonly<Record<TipoDePersona, readonly RegimenDeIsrDeEmpresa[]>> = {
  juridica: ['utilidades', 'opcional_simplificado', 'exento'],
  individual: ['utilidades', 'opcional_simplificado'],
};

/** Solo estos regímenes de IVA tienen régimen de ISR; en los demás el ISR no aplica (campo bloqueado). */
export const tieneRegimenDeIsr = (regimenIva: RegimenDeIva): boolean =>
  regimenIva === 'general' || regimenIva === 'no_afiliado';

/** Solo el régimen general puede ser agente de retención del IVA; en los demás el campo queda en «ninguno». */
export const puedeSerAgenteDeIva = (regimenIva: RegimenDeIva): boolean => regimenIva === 'general';

/** Los regímenes de ISR entre los que puede escoger esa persona. */
export const regimenesDeIsrPosibles = (tipoDePersona: TipoDePersona | null): readonly RegimenDeIsrDeEmpresa[] =>
  ISR_DE_PERSONA[tipoDePersona ?? 'individual'];

function isrPropuesto(
  regimenIva: RegimenDeIva,
  tipoDePersona: TipoDePersona,
  escogido: RegimenDeIsrDeEmpresa | null,
): RegimenDeIsrDeEmpresa | null | undefined {
  if (!tieneRegimenDeIsr(regimenIva)) return null;
  if (escogido && ISR_DE_PERSONA[tipoDePersona].includes(escogido)) return escogido;
  if (regimenIva === 'general') return 'utilidades';
  return tipoDePersona === 'juridica' ? 'exento' : undefined;
}

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
 * «R1-e resuelto» del diseño). Proponen y no imponen: lo que la ley exige lo rechaza el servidor.
 */
export function datosPropuestos(
  regimenIva: RegimenDeIva,
  tipoDePersona: TipoDePersona,
  regimenIsr: RegimenDeIsrDeEmpresa | null = null,
): PropuestaFiscalDeEmpresa {
  const isr = isrPropuesto(regimenIva, tipoDePersona, regimenIsr);
  return {
    regimenIsr: isr,
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: agenteDeIsrPropuesto(regimenIva, tipoDePersona, isr),
  };
}
