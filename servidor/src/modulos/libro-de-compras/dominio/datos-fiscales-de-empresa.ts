import { DatosFiscalesInvalidos, type ProblemaDeDatosFiscales } from './errores.js';

export const REGIMENES_DE_IVA = [
  'general',
  'pequeno_contribuyente',
  'pequeno_contribuyente_electronico',
  'contribuyente_agropecuario',
  'primario_pecuario',
  'no_afiliado',
] as const;
export const REGIMENES_DE_ISR_DE_EMPRESA = ['utilidades', 'opcional_simplificado', 'exento'] as const;
export const TIPOS_DE_PERSONA = ['individual', 'juridica'] as const;
export const AGENTES_DE_RETENCION_DE_IVA = [
  'ninguno',
  'exportador',
  'contribuyente_especial',
  'sector_publico',
  'otro',
] as const;

export type RegimenDeIva = (typeof REGIMENES_DE_IVA)[number];
export type RegimenDeIsrDeEmpresa = (typeof REGIMENES_DE_ISR_DE_EMPRESA)[number];
export type TipoDePersona = (typeof TIPOS_DE_PERSONA)[number];
export type AgenteDeRetencionDeIva = (typeof AGENTES_DE_RETENCION_DE_IVA)[number];

/** Lo que dice una vigencia de la sección fiscal de una empresa. `regimenIsr` nulo es «no aplica». */
export interface PropiedadesFiscalesDeEmpresa {
  tipoDePersona: TipoDePersona;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
}

/** Los regímenes de IVA que además tienen régimen de ISR (en los demás, el ISR «no aplica»). */
const REGIMENES_CON_ISR: readonly RegimenDeIva[] = ['general', 'no_afiliado'];

type Problemas = ProblemaDeDatosFiscales[];

function problemasDelAgenteDeIva(datos: PropiedadesFiscalesDeEmpresa): Problemas {
  if (datos.regimenIva === 'general' || datos.agenteDeRetencionIva === 'ninguno') return [];
  return [{ campo: 'agenteDeRetencionIva', mensaje: 'Solo el régimen general puede ser agente de retención del IVA.' }];
}

function problemasDelIsr(datos: PropiedadesFiscalesDeEmpresa): Problemas {
  const { regimenIva, regimenIsr, tipoDePersona } = datos;
  const aplica = REGIMENES_CON_ISR.includes(regimenIva);
  if (aplica && regimenIsr === null)
    return [{ campo: 'regimenIsr', mensaje: 'Escoja el régimen del ISR de la empresa.' }];
  if (!aplica && regimenIsr !== null)
    return [{ campo: 'regimenIsr', mensaje: 'Con este régimen de IVA el ISR no aplica.' }];
  if (regimenIsr === 'exento' && tipoDePersona !== 'juridica') {
    return [{ campo: 'regimenIsr', mensaje: 'Solo una persona jurídica puede estar exenta del ISR.' }];
  }
  return [];
}

function problemasDelTipoDePersona(datos: PropiedadesFiscalesDeEmpresa): Problemas {
  if (datos.regimenIva !== 'contribuyente_agropecuario' || datos.tipoDePersona === 'individual') return [];
  return [{ campo: 'tipoDePersona', mensaje: 'El contribuyente agropecuario solo puede ser persona individual.' }];
}

/**
 * Los problemas de unos datos fiscales de empresa, uno por campo. Los usan el esquema del formulario (para
 * mostrarlos junto al campo) y `crear` (que no deja pasar datos contradictorios).
 */
export function problemasFiscalesDeEmpresa(datos: PropiedadesFiscalesDeEmpresa): ProblemaDeDatosFiscales[] {
  return [...problemasDelAgenteDeIva(datos), ...problemasDelIsr(datos), ...problemasDelTipoDePersona(datos)];
}

/**
 * Datos fiscales de una empresa en una vigencia: tipo de persona, régimen de IVA y de ISR y si es agente de
 * retención. No hay valores por omisión: una empresa sin datos guardados no tiene régimen supuesto.
 */
export class DatosFiscalesDeEmpresa {
  private constructor(private readonly propiedades: PropiedadesFiscalesDeEmpresa) {}

  /** @throws DatosFiscalesInvalidos si los datos se contradicen entre sí. */
  static crear(propiedades: PropiedadesFiscalesDeEmpresa): DatosFiscalesDeEmpresa {
    const problemas = problemasFiscalesDeEmpresa(propiedades);
    if (problemas.length > 0) throw new DatosFiscalesInvalidos(problemas);
    return new DatosFiscalesDeEmpresa({ ...propiedades });
  }

  /**
   * Un punto de partida (persona jurídica, régimen general, ISR sobre utilidades) para armar datos en pruebas.
   * No es un supuesto: una empresa sin datos guardados no tiene régimen y registrar documentos se le rechaza.
   */
  static porOmision(): DatosFiscalesDeEmpresa {
    return new DatosFiscalesDeEmpresa({
      tipoDePersona: 'juridica',
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
    });
  }

  /** Copia de solo lectura de sus propiedades, para guardarla o mostrarla. */
  instantanea(): Readonly<PropiedadesFiscalesDeEmpresa> {
    return { ...this.propiedades };
  }

  /**
   * `true` si la empresa acredita el IVA de sus compras. Hoy solo el régimen general; cuando existan los seis
   * regímenes, se amplía aquí (y solo aquí).
   */
  daCreditoFiscal(): boolean {
    return this.propiedades.regimenIva === 'general';
  }

  /** Paga el ISR sobre utilidades (no el opcional simplificado, ni está exenta, ni el ISR le aplica). */
  tieneIsrSobreUtilidades(): boolean {
    return this.propiedades.regimenIsr === 'utilidades';
  }

  /** Los cuatro datos que cambian el cálculo de un documento; el tipo de persona no cuenta. */
  tieneLosMismosDatosFiscalesQue(otros: DatosFiscalesDeEmpresa): boolean {
    const mias = this.propiedades;
    const suyas = otros.propiedades;
    return (
      mias.regimenIva === suyas.regimenIva &&
      mias.regimenIsr === suyas.regimenIsr &&
      mias.agenteDeRetencionIva === suyas.agenteDeRetencionIva &&
      mias.esAgenteDeRetencionIsr === suyas.esAgenteDeRetencionIsr
    );
  }

  esIgualA(otros: DatosFiscalesDeEmpresa): boolean {
    const mismaPersona = this.propiedades.tipoDePersona === otros.propiedades.tipoDePersona;
    return mismaPersona && this.tieneLosMismosDatosFiscalesQue(otros);
  }

  /** Los mismos datos con otro tipo de persona (el dominio lo mantiene igual en todas las vigencias). */
  conTipoDePersona(tipoDePersona: TipoDePersona): DatosFiscalesDeEmpresa {
    return DatosFiscalesDeEmpresa.crear({ ...this.propiedades, tipoDePersona });
  }
}
