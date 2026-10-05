import { dividirRedondeando } from './aritmetica-fiscal.js';
import type {
  ConfiguracionDeRetenciones,
  EntradaDeRetenciones,
  EstrategiaDeRetencion,
  RetencionPropuesta,
} from './retencion-propuesta.js';

/**
 * Base del ISR: lo pagado sin IVA. Incluye lo exento (la exención del IVA no es renta exenta) y el IDP
 * solo si la empresa lo decide (por omisión sí).
 */
export function baseDeIsr(entrada: EntradaDeRetenciones): number {
  const { total, iva, idp } = entrada.documento.totales;
  return total - iva - (entrada.configuracion.incluyeIdpEnBaseIsr ? 0 : idp);
}

/** Retención por escalones, redondeada una sola vez: tasa del primer tramo hasta el límite y la del excedente. */
export function isrPorEscalones(base: number, config: ConfiguracionDeRetenciones): number {
  const primero = Math.min(base, config.limitePrimerTramoIsr);
  const excedente = base - primero;
  const diezMilesimas =
    BigInt(primero) * BigInt(config.porcentajeIsrPrimerTramo) +
    BigInt(excedente) * BigInt(config.porcentajeIsrExcedente);
  return Number(dividirRedondeando(diezMilesimas, 10000n));
}

/** ISR del proveedor del régimen opcional simplificado: si la base llega al mínimo, 5 % y 7 % del excedente. */
export class EstrategiaDeIsrOpcionalSimplificado implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const proveedor = entrada.proveedor.instantanea();
    const base = baseDeIsr(entrada);
    const aplica =
      entrada.tipo === 'factura' &&
      entrada.empresa.instantanea().esAgenteDeRetencionIsr &&
      proveedor.regimenIsr === 'opcional_simplificado' &&
      proveedor.seLeRetieneIsr &&
      base > 0 &&
      base >= entrada.configuracion.minimoIsr;
    if (!aplica) return [];
    const montoPropuesto = isrPorEscalones(base, entrada.configuracion);
    return [
      {
        impuesto: 'isr',
        regla: 'isr_opcional_simplificado',
        base,
        porcentaje: null,
        montoPropuesto,
        origenDeLaFecha: 'emision',
      },
    ];
  }
}
