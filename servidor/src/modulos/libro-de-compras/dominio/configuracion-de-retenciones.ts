import { aCentesimasDeConfiguracion, quetzalesACentavos } from './aritmetica-fiscal.js';
import type { ConfiguracionDeRetenciones } from './retencion-propuesta.js';

const RAIZ_IVA = 'libro-de-compras.retenciones_iva';
const RAIZ_ISR = 'libro-de-compras.retenciones_isr';

/**
 * Convierte las variables de configuración (porcentajes y quetzales como números) en centésimas y
 * centavos enteros. `valor` lee una variable ya resuelta por niveles (para la empresa que registra).
 */
export function configuracionDeRetenciones(valor: (clave: string) => number | boolean): ConfiguracionDeRetenciones {
  const porcentaje = (clave: string): number => aCentesimasDeConfiguracion(Number(valor(clave)));
  const monto = (clave: string): number => quetzalesACentavos(Number(valor(clave)));
  return {
    porcentajeExportadorAgropecuario: porcentaje(`${RAIZ_IVA}.exportador_agropecuario`),
    porcentajeExportador: porcentaje(`${RAIZ_IVA}.exportador`),
    porcentajeContribuyenteEspecial: porcentaje(`${RAIZ_IVA}.contribuyente_especial`),
    porcentajeOtroAgente: porcentaje(`${RAIZ_IVA}.otro_agente`),
    porcentajeSectorPublico: porcentaje(`${RAIZ_IVA}.sector_publico`),
    porcentajePequenoContribuyente: porcentaje(`${RAIZ_IVA}.pequeno_contribuyente`),
    porcentajeIsrPrimerTramo: porcentaje(`${RAIZ_ISR}.tasa_primer_tramo`),
    porcentajeIsrExcedente: porcentaje(`${RAIZ_ISR}.tasa_excedente`),
    minimoIva: monto(`${RAIZ_IVA}.minimo`),
    minimoSectorPublico: monto(`${RAIZ_IVA}.minimo_sector_publico`),
    umbralPequenoContribuyente: monto(`${RAIZ_IVA}.umbral_pequeno_contribuyente`),
    limitePrimerTramoIsr: monto(`${RAIZ_ISR}.limite_primer_tramo`),
    minimoIsr: monto(`${RAIZ_ISR}.minimo`),
    incluyeIdpEnBaseIsr: valor(`${RAIZ_ISR}.incluye_idp`) === true,
  };
}
