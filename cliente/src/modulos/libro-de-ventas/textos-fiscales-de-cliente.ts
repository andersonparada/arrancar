import type { AgenteDeRetencionDeIvaDeCliente } from './servicios/datos-fiscales-de-cliente.api';

export const TITULO_SECCION_FISCAL_DE_CLIENTE = 'Datos fiscales (ventas)';

export const AGENTES_DE_RETENCION_DE_IVA: Record<AgenteDeRetencionDeIvaDeCliente, string> = {
  ninguno: 'No es agente de retención',
  exportador: 'Exportador',
  contribuyente_especial: 'Contribuyente especial',
  sector_publico: 'Sector público',
  otro: 'Otro agente de retención',
};

export const TEXTOS_FISCALES_DE_CLIENTE = {
  agenteAyuda:
    'Si es agente de retención del IVA, retiene parte del IVA al pagarle y le debe dar la constancia. Déjelo en «No es agente de retención» si no retiene.',
  exportaAyuda: 'Compra productos agropecuarios para exportarlos: la retención se propone sobre las líneas de bienes.',
  exportaNoAplicaAyuda: 'Solo aplica a un cliente exportador.',
  retieneIsrAyuda:
    'Lleva contabilidad completa y le retiene el ISR a quien está en el régimen opcional simplificado sobre ingresos.',
  retieneIvaAPequenoContribuyenteAyuda:
    'Retiene el IVA a quien es pequeño contribuyente. Solo aplica si es agente de retención del IVA.',
  retieneIvaAPequenoContribuyenteNoAplicaAyuda: 'Primero escoja qué agente de retención del IVA es.',
  sinDatosGuardados:
    'Todavía no se han guardado: se asume que este cliente no retiene nada. Edite el cliente para definirlos.',
  propone: 'Al venderle se le propondrá, según el régimen de su empresa en el mes y los mínimos de la ley:',
  nada: 'No se le propone ninguna retención al venderle.',
  retieneIva: 'Retención del IVA según su tipo de agente.',
  retieneIvaExportador: 'Retención del IVA de los bienes agropecuarios que exporta.',
  retieneIvaAPequenoContribuyente: 'Retención del IVA si su empresa es pequeño contribuyente.',
  retieneIsr: 'Retención del ISR si su empresa está en el régimen opcional simplificado.',
  ajustable: 'Podrá ajustar cada retención al registrar el documento.',
} as const;
