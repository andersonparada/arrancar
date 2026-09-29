import { DatosFiscalesInvalidos, type ProblemaDeDatosFiscales } from './errores.js';

export const REGIMENES_DE_ISR_DE_PROVEEDOR = ['utilidades', 'opcional_simplificado', 'no_domiciliado'] as const;

export type RegimenDeIsrDeProveedor = (typeof REGIMENES_DE_ISR_DE_PROVEEDOR)[number];

/** Lo que dice la sección fiscal de un proveedor (una por proveedor, igual para todas las empresas de la cuenta). */
export interface PropiedadesFiscalesDeProveedor {
  esPequenoContribuyente: boolean;
  /** El pequeño contribuyente no tiene régimen de ISR aparte: es `null`; los demás siempre tienen uno. */
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
}

/** Lo que el usuario decide; los tres «se le retiene» se proponen de aquí (`porOmision`). */
export type BaseFiscalDeProveedor = Pick<
  PropiedadesFiscalesDeProveedor,
  'esPequenoContribuyente' | 'regimenIsr' | 'esAgenteDeRetencionIva'
>;

/**
 * Los tres «se le retiene» que se proponen según el régimen: se le retiene el IVA si no es pequeño contribuyente
 * ni agente; el ISR, si es del régimen opcional simplificado; y el IVA de pequeño contribuyente, si lo es.
 */
export function retencionesPropuestas(
  base: BaseFiscalDeProveedor,
): Pick<PropiedadesFiscalesDeProveedor, 'seLeRetieneIva' | 'seLeRetieneIsr' | 'seLeRetieneIvaPequenoContribuyente'> {
  return {
    seLeRetieneIva: !base.esPequenoContribuyente && !base.esAgenteDeRetencionIva,
    seLeRetieneIsr: base.regimenIsr === 'opcional_simplificado',
    seLeRetieneIvaPequenoContribuyente: base.esPequenoContribuyente,
  };
}

const problema = (campo: string, mensaje: string): ProblemaDeDatosFiscales => ({ campo, mensaje });

function problemasDelRegimen(datos: PropiedadesFiscalesDeProveedor): ProblemaDeDatosFiscales[] {
  if (datos.esPequenoContribuyente && datos.regimenIsr !== null) {
    return [problema('regimenIsr', 'El pequeño contribuyente no tiene régimen de ISR aparte.')];
  }
  if (!datos.esPequenoContribuyente && datos.regimenIsr === null) {
    return [problema('regimenIsr', 'Escoja el régimen de ISR del proveedor.')];
  }
  return [];
}

interface ReglaDeRetencion {
  campo: string;
  mensaje: string;
  seInfringe: (datos: PropiedadesFiscalesDeProveedor) => boolean;
}

const REGLAS_DE_RETENCION: readonly ReglaDeRetencion[] = [
  {
    campo: 'esAgenteDeRetencionIva',
    mensaje: 'Un pequeño contribuyente no es agente de retención del IVA.',
    seInfringe: (datos) => datos.esPequenoContribuyente && datos.esAgenteDeRetencionIva,
  },
  {
    campo: 'seLeRetieneIva',
    mensaje: 'A un pequeño contribuyente no se le retiene el IVA general.',
    seInfringe: (datos) => datos.esPequenoContribuyente && datos.seLeRetieneIva,
  },
  {
    campo: 'seLeRetieneIsr',
    mensaje: 'A un pequeño contribuyente no se le retiene ISR.',
    seInfringe: (datos) => datos.esPequenoContribuyente && datos.seLeRetieneIsr,
  },
  {
    campo: 'seLeRetieneIvaPequenoContribuyente',
    mensaje: 'Solo se retiene el IVA de pequeño contribuyente a quien lo es.',
    seInfringe: (datos) => !datos.esPequenoContribuyente && datos.seLeRetieneIvaPequenoContribuyente,
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
   * Lo que se propone según el régimen (ver `retencionesPropuestas`). Sin datos: régimen sobre utilidades,
   * ni pequeño contribuyente ni agente.
   */
  static porOmision(base: Partial<BaseFiscalDeProveedor> = {}): DatosFiscalesDeProveedor {
    const esPequenoContribuyente = base.esPequenoContribuyente ?? false;
    const completa = {
      esPequenoContribuyente,
      esAgenteDeRetencionIva: base.esAgenteDeRetencionIva ?? false,
      regimenIsr: esPequenoContribuyente ? null : (base.regimenIsr ?? 'utilidades'),
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
