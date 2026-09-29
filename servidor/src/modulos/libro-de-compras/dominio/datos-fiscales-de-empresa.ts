import { DatosFiscalesInvalidos, type ProblemaDeDatosFiscales } from './errores.js';

export const REGIMENES_DE_IVA = ['general', 'pequeno_contribuyente'] as const;
export const REGIMENES_DE_ISR_DE_EMPRESA = ['utilidades', 'opcional_simplificado'] as const;
export const AGENTES_DE_RETENCION_DE_IVA = [
  'ninguno',
  'exportador',
  'contribuyente_especial',
  'sector_publico',
  'otro',
] as const;

export type RegimenDeIva = (typeof REGIMENES_DE_IVA)[number];
export type RegimenDeIsrDeEmpresa = (typeof REGIMENES_DE_ISR_DE_EMPRESA)[number];
export type AgenteDeRetencionDeIva = (typeof AGENTES_DE_RETENCION_DE_IVA)[number];

/** Lo que dice la sección fiscal de una empresa (una por empresa). */
export interface PropiedadesFiscalesDeEmpresa {
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
}

const POR_OMISION: PropiedadesFiscalesDeEmpresa = {
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: false,
};

/**
 * Los problemas de unos datos fiscales de empresa, uno por campo. Los usan el esquema del formulario (para
 * mostrarlos junto al campo) y `crear` (que no deja pasar datos contradictorios).
 */
export function problemasFiscalesDeEmpresa(datos: PropiedadesFiscalesDeEmpresa): ProblemaDeDatosFiscales[] {
  if (datos.regimenIva === 'pequeno_contribuyente' && datos.agenteDeRetencionIva !== 'ninguno') {
    return [
      {
        campo: 'agenteDeRetencionIva',
        mensaje: 'Un pequeño contribuyente no es agente de retención del IVA.',
      },
    ];
  }
  return [];
}

/**
 * Datos fiscales de una empresa: su régimen de IVA y de ISR y si es agente de retención. Sin fila guardada,
 * la empresa tiene los valores por omisión (régimen general, sobre utilidades, sin agente).
 */
export class DatosFiscalesDeEmpresa {
  private constructor(private readonly propiedades: PropiedadesFiscalesDeEmpresa) {}

  /** @throws DatosFiscalesInvalidos si un pequeño contribuyente figura como agente de retención del IVA. */
  static crear(propiedades: PropiedadesFiscalesDeEmpresa): DatosFiscalesDeEmpresa {
    const problemas = problemasFiscalesDeEmpresa(propiedades);
    if (problemas.length > 0) throw new DatosFiscalesInvalidos(problemas);
    return new DatosFiscalesDeEmpresa({ ...propiedades });
  }

  static porOmision(): DatosFiscalesDeEmpresa {
    return new DatosFiscalesDeEmpresa({ ...POR_OMISION });
  }

  /** Copia de solo lectura de sus propiedades, para guardarla o mostrarla. */
  instantanea(): Readonly<PropiedadesFiscalesDeEmpresa> {
    return { ...this.propiedades };
  }

  esIgualA(otros: DatosFiscalesDeEmpresa): boolean {
    const mias = this.propiedades;
    const suyas = otros.propiedades;
    return (
      mias.regimenIva === suyas.regimenIva &&
      mias.regimenIsr === suyas.regimenIsr &&
      mias.agenteDeRetencionIva === suyas.agenteDeRetencionIva &&
      mias.esAgenteDeRetencionIsr === suyas.esAgenteDeRetencionIsr
    );
  }
}
