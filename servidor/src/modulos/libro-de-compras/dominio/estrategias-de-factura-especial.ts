import { porcentajeDe } from './aritmetica-fiscal.js';
import type { EntradaDeRetenciones, EstrategiaDeRetencion, RetencionPropuesta } from './retencion-propuesta.js';

/** El IVA lo retiene por completo quien emite la factura especial (Ley del IVA art. 52): 100 % en centésimas. */
const TODO_EL_IVA = 10000;

/**
 * Factura especial: la empresa que la emite retiene el 100 % del IVA del documento. No tiene mínimo ni mira las
 * casillas del proveedor ni si la empresa es agente: la ley se lo manda a quien emite. Se fecha con la emisión.
 */
export class EstrategiaDeIvaDeFacturaEspecial implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const base = entrada.documento.totales.iva;
    if (entrada.tipo !== 'factura_especial' || base <= 0) return [];
    return [
      {
        impuesto: 'iva',
        regla: 'iva_factura_especial',
        base,
        porcentaje: TODO_EL_IVA,
        montoPropuesto: base,
        origenDeLaFecha: 'emision',
      },
    ];
  }
}

/**
 * Factura especial: el ISR que retiene la empresa (5 % por omisión, Decreto 10-2012 art. 16) sobre el valor sin
 * IVA. El contador fija la base: no depende de si el IDP entra o no en la base de las demás retenciones de ISR.
 */
export class EstrategiaDeIsrDeFacturaEspecial implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const { total, iva } = entrada.documento.totales;
    const base = total - iva;
    if (entrada.tipo !== 'factura_especial' || base <= 0) return [];
    const porcentaje = entrada.configuracion.porcentajeIsrFacturaEspecial;
    return [
      {
        impuesto: 'isr',
        regla: 'isr_factura_especial',
        base,
        porcentaje,
        montoPropuesto: porcentajeDe(base, porcentaje),
        origenDeLaFecha: 'emision',
      },
    ];
  }
}
