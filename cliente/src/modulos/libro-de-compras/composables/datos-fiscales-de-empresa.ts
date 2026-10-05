import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { DatosFiscalesDeEmpresa } from '../servicios/libro-de-compras.api';
import { AGENTES_DE_RETENCION_DE_IVA, REGIMENES_DE_ISR_DE_EMPRESA, REGIMENES_DE_IVA } from '../textos';

/** Lo que el formulario de Empresas envía en `secciones['libro-de-compras']`. */
export type FiscalesDeEmpresa = Pick<
  DatosFiscalesDeEmpresa,
  'regimenIva' | 'regimenIsr' | 'agenteDeRetencionIva' | 'esAgenteDeRetencionIsr'
>;

/** Sin datos guardados, la empresa es de régimen general, sobre utilidades y lleva contabilidad completa (agente de retención del ISR). */
export const fiscalesDeEmpresaPorOmision = (): FiscalesDeEmpresa => ({
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
});

/** Lo guardado (o los valores por omisión que devuelve el servidor) pasa al formulario, sin el resto del DTO. */
export const fiscalesDeEmpresaDesde = (datos: DatosFiscalesDeEmpresa): FiscalesDeEmpresa => ({
  regimenIva: datos.regimenIva,
  regimenIsr: datos.regimenIsr,
  agenteDeRetencionIva: datos.agenteDeRetencionIva,
  esAgenteDeRetencionIsr: datos.esAgenteDeRetencionIsr,
});

/** Un pequeño contribuyente no es agente de retención del IVA: al elegir ese régimen se quita. */
export function conRegimenDeIva(fiscales: FiscalesDeEmpresa, regimenIva: FiscalesDeEmpresa['regimenIva']) {
  const agenteDeRetencionIva = regimenIva === 'pequeno_contribuyente' ? 'ninguno' : fiscales.agenteDeRetencionIva;
  return { ...fiscales, regimenIva, agenteDeRetencionIva };
}

/** Los datos para la ficha, ya con nombres legibles. */
export function detallesDeEmpresa(fiscales: FiscalesDeEmpresa): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Régimen de IVA', valor: REGIMENES_DE_IVA[fiscales.regimenIva] },
    { etiqueta: 'Régimen de ISR', valor: REGIMENES_DE_ISR_DE_EMPRESA[fiscales.regimenIsr] },
    { etiqueta: 'Agente de retención del IVA', valor: AGENTES_DE_RETENCION_DE_IVA[fiscales.agenteDeRetencionIva] },
    {
      etiqueta: 'Lleva contabilidad completa (agente de retención del ISR)',
      valor: fiscales.esAgenteDeRetencionIsr ? 'Sí' : 'No',
    },
  ];
}
