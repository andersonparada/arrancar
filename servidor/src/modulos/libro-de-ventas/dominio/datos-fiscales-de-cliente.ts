import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

export const AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE = [
  'ninguno',
  'exportador',
  'contribuyente_especial',
  'sector_publico',
  'otro',
] as const;

export type AgenteDeRetencionDeIvaDeCliente = (typeof AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE)[number];

/** Lo fiscal de un cliente que importa al vender: si retiene IVA o ISR y qué. Sin datos guardados no retiene nada. */
export interface PropiedadesFiscalesDeCliente {
  agenteDeRetencionIva: AgenteDeRetencionDeIvaDeCliente;
  /** Solo con `exportador`: propone la retención del 65 % sobre las líneas de bien. */
  exportaProductosAgropecuarios: boolean;
  /** Lleva contabilidad completa y retiene ISR al opcional simplificado. */
  retieneIsr: boolean;
  /** Solo si es agente de retención del IVA. */
  retieneIvaAPequenoContribuyente: boolean;
}

export interface ProblemaDeDatosFiscalesDeCliente {
  campo: string;
  mensaje: string;
}

/** Los datos fiscales del cliente se contradicen. */
export class DatosFiscalesDeClienteInvalidos extends DatoInvalido {
  readonly codigo = 'datos_fiscales_de_cliente_invalidos';

  constructor(readonly problemas: readonly ProblemaDeDatosFiscalesDeCliente[]) {
    super(problemas.map((problema) => problema.mensaje).join(' '), problemas);
  }
}

/**
 * Los problemas de unos datos, uno o más por campo. Los usan el esquema del formulario (para mostrarlos junto al
 * campo) y `crear` (que no deja pasar datos contradictorios).
 */
export function problemasFiscalesDeCliente(datos: PropiedadesFiscalesDeCliente): ProblemaDeDatosFiscalesDeCliente[] {
  const problemas: ProblemaDeDatosFiscalesDeCliente[] = [];
  if (datos.exportaProductosAgropecuarios && datos.agenteDeRetencionIva !== 'exportador') {
    problemas.push({
      campo: 'exportaProductosAgropecuarios',
      mensaje: 'Solo un cliente exportador compra productos agropecuarios para exportarlos.',
    });
  }
  if (datos.retieneIvaAPequenoContribuyente && datos.agenteDeRetencionIva === 'ninguno') {
    problemas.push({
      campo: 'retieneIvaAPequenoContribuyente',
      mensaje: 'Solo un agente de retención del IVA retiene el IVA de pequeño contribuyente.',
    });
  }
  return problemas;
}

/** Datos fiscales de un cliente: el usuario manda dentro de lo que las reglas permiten. */
export class DatosFiscalesDeCliente {
  private constructor(private readonly propiedades: PropiedadesFiscalesDeCliente) {}

  /** @throws DatosFiscalesDeClienteInvalidos si los datos se contradicen (ver `problemasFiscalesDeCliente`). */
  static crear(propiedades: PropiedadesFiscalesDeCliente): DatosFiscalesDeCliente {
    const problemas = problemasFiscalesDeCliente(propiedades);
    if (problemas.length > 0) throw new DatosFiscalesDeClienteInvalidos(problemas);
    return new DatosFiscalesDeCliente({ ...propiedades });
  }

  /** Lo que vale sin datos guardados: el cliente no retiene nada (no se supone). */
  static porOmision(): DatosFiscalesDeCliente {
    return DatosFiscalesDeCliente.crear({
      agenteDeRetencionIva: 'ninguno',
      exportaProductosAgropecuarios: false,
      retieneIsr: false,
      retieneIvaAPequenoContribuyente: false,
    });
  }

  /** Copia de solo lectura de sus propiedades, para guardarla o mostrarla. */
  instantanea(): Readonly<PropiedadesFiscalesDeCliente> {
    return { ...this.propiedades };
  }

  esIgualA(otros: DatosFiscalesDeCliente): boolean {
    const mias = this.propiedades;
    const suyas = otros.propiedades;
    return (Object.keys(mias) as Array<keyof PropiedadesFiscalesDeCliente>).every(
      (clave) => mias[clave] === suyas[clave],
    );
  }
}
