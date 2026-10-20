import { DatosFiscalesInvalidos, type ProblemaDeDatosFiscales } from './errores.js';

/** Los dos últimos están derogados (Decreto 7-2019) y solo existen para proveedores o documentos anteriores. */
export const REGIMENES_DE_IVA_DE_PROVEEDOR = [
  'general',
  'pequeno_contribuyente',
  'primario',
  'pecuario',
  'sin_inscripcion',
  'no_domiciliado',
  'pequeno_contribuyente_electronico',
  'contribuyente_agropecuario',
] as const;

export type RegimenDeIvaDeProveedor = (typeof REGIMENES_DE_IVA_DE_PROVEEDOR)[number];

export const REGIMENES_DE_ISR_DE_PROVEEDOR = [
  'utilidades',
  'opcional_simplificado',
  'no_domiciliado',
  'exento',
] as const;

export type RegimenDeIsrDeProveedor = (typeof REGIMENES_DE_ISR_DE_PROVEEDOR)[number];

/** Lo que dice la sección fiscal de un proveedor (una por proveedor, igual para todas las empresas de la cuenta). */
export interface PropiedadesFiscalesDeProveedor {
  regimenIva: RegimenDeIvaDeProveedor;
  /**
   * Solo el régimen general escoge uno (`utilidades`, `opcional_simplificado` o `exento`) y el no domiciliado
   * lleva `no_domiciliado`; en los demás regímenes de IVA es `null` («no aplica»).
   */
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
}

/** Lo que el usuario decide; los tres «se le retiene» se proponen de aquí (`porOmision`). */
export type BaseFiscalDeProveedor = Pick<
  PropiedadesFiscalesDeProveedor,
  'regimenIva' | 'regimenIsr' | 'esAgenteDeRetencionIva'
>;

/** El régimen de ISR que corresponde al de IVA; solo el general deja escoger (por omisión, `utilidades`). */
export function regimenIsrPropuesto(
  regimenIva: RegimenDeIvaDeProveedor,
  escogido?: RegimenDeIsrDeProveedor | null,
): RegimenDeIsrDeProveedor | null {
  if (regimenIva === 'no_domiciliado') return 'no_domiciliado';
  if (regimenIva !== 'general') return null;
  return escogido ?? 'utilidades';
}

/**
 * Los tres «se le retiene» que se proponen según el régimen: solo el general es sujeto del IVA (si no es agente);
 * el ISR, si es del régimen opcional simplificado; el 5 % de pequeño contribuyente, solo al pequeño contribuyente
 * (el electrónico derogado y los demás especiales no retienen, decisión del contador).
 */
export function retencionesPropuestas(
  base: BaseFiscalDeProveedor,
): Pick<PropiedadesFiscalesDeProveedor, 'seLeRetieneIva' | 'seLeRetieneIsr' | 'seLeRetieneIvaPequenoContribuyente'> {
  return {
    seLeRetieneIva: base.regimenIva === 'general' && !base.esAgenteDeRetencionIva,
    seLeRetieneIsr: base.regimenIsr === 'opcional_simplificado',
    seLeRetieneIvaPequenoContribuyente: base.regimenIva === 'pequeno_contribuyente',
  };
}

const problema = (campo: string, mensaje: string): ProblemaDeDatosFiscales => ({ campo, mensaje });

function problemasDelRegimen(datos: PropiedadesFiscalesDeProveedor): ProblemaDeDatosFiscales[] {
  const { regimenIva, regimenIsr } = datos;
  if (regimenIva === 'general') {
    if (regimenIsr === null) return [problema('regimenIsr', 'Escoja el régimen de ISR del proveedor.')];
    if (regimenIsr === 'no_domiciliado') return [problema('regimenIsr', 'Solo un proveedor no domiciliado lo es.')];
    return [];
  }
  if (regimenIva === 'no_domiciliado') {
    if (regimenIsr === 'no_domiciliado') return [];
    return [problema('regimenIsr', 'Un proveedor no domiciliado lleva el régimen de ISR de no domiciliado.')];
  }
  return regimenIsr === null ? [] : [problema('regimenIsr', 'Este régimen de IVA no tiene régimen de ISR aparte.')];
}

interface ReglaDeRetencion {
  campo: string;
  mensaje: string;
  seInfringe: (datos: PropiedadesFiscalesDeProveedor) => boolean;
}

const REGLAS_DE_RETENCION: readonly ReglaDeRetencion[] = [
  {
    campo: 'esAgenteDeRetencionIva',
    mensaje: 'Solo un proveedor del régimen general puede ser agente de retención del IVA.',
    seInfringe: (datos) => datos.regimenIva !== 'general' && datos.esAgenteDeRetencionIva,
  },
  {
    campo: 'seLeRetieneIva',
    mensaje: 'Solo al régimen general se le retiene el IVA general.',
    seInfringe: (datos) => datos.regimenIva !== 'general' && datos.seLeRetieneIva,
  },
  {
    campo: 'seLeRetieneIsr',
    mensaje: 'No se le retiene ISR a un proveedor sin régimen de ISR ni a uno exento.',
    seInfringe: (datos) => (datos.regimenIsr === null || datos.regimenIsr === 'exento') && datos.seLeRetieneIsr,
  },
  {
    campo: 'seLeRetieneIvaPequenoContribuyente',
    mensaje: 'Solo se retiene el IVA de pequeño contribuyente a quien lo es.',
    seInfringe: (datos) => datos.regimenIva !== 'pequeno_contribuyente' && datos.seLeRetieneIvaPequenoContribuyente,
  },
];

function problemasDeRetenciones(datos: PropiedadesFiscalesDeProveedor): ProblemaDeDatosFiscales[] {
  return REGLAS_DE_RETENCION.filter((regla) => regla.seInfringe(datos)).map(({ campo, mensaje }) =>
    problema(campo, mensaje),
  );
}

/**
 * Los problemas de unos datos fiscales de proveedor, uno o más por campo. Los usan el esquema del formulario
 * (para mostrarlos junto al campo) y `crear` (que no deja pasar datos contradictorios).
 */
export function problemasFiscalesDeProveedor(datos: PropiedadesFiscalesDeProveedor): ProblemaDeDatosFiscales[] {
  return [...problemasDelRegimen(datos), ...problemasDeRetenciones(datos)];
}

/**
 * Datos fiscales de un proveedor. Los tres «se le retiene» existen porque hay proveedores exentos por
 * resolución de la SAT, cooperativas u otros casos: el usuario manda dentro de lo que el régimen permite.
 */
export class DatosFiscalesDeProveedor {
  private constructor(private readonly propiedades: PropiedadesFiscalesDeProveedor) {}

  /** @throws DatosFiscalesInvalidos si los datos se contradicen (ver `problemasFiscalesDeProveedor`). */
  static crear(propiedades: PropiedadesFiscalesDeProveedor): DatosFiscalesDeProveedor {
    const problemas = problemasFiscalesDeProveedor(propiedades);
    if (problemas.length > 0) throw new DatosFiscalesInvalidos(problemas);
    return new DatosFiscalesDeProveedor({ ...propiedades });
  }

  /**
   * Lo que se propone según el régimen (ver `retencionesPropuestas`). Sin datos: régimen general sobre
   * utilidades y que no es agente. Un régimen especial fuerza «no aplica» en el ISR y que no es agente.
   */
  static porOmision(base: Partial<BaseFiscalDeProveedor> = {}): DatosFiscalesDeProveedor {
    const regimenIva = base.regimenIva ?? 'general';
    const completa = {
      regimenIva,
      esAgenteDeRetencionIva: regimenIva === 'general' && (base.esAgenteDeRetencionIva ?? false),
      regimenIsr: regimenIsrPropuesto(regimenIva, base.regimenIsr),
    };
    return DatosFiscalesDeProveedor.crear({ ...completa, ...retencionesPropuestas(completa) });
  }

  /** Copia de solo lectura de sus propiedades, para guardarla o mostrarla. */
  instantanea(): Readonly<PropiedadesFiscalesDeProveedor> {
    return { ...this.propiedades };
  }

  esIgualA(otros: DatosFiscalesDeProveedor): boolean {
    const mias = this.propiedades;
    const suyas = otros.propiedades;
    return (Object.keys(mias) as Array<keyof PropiedadesFiscalesDeProveedor>).every(
      (clave) => mias[clave] === suyas[clave],
    );
  }
}
