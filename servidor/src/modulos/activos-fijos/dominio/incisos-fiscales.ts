/**
 * Los incisos del art. 28 de la Ley de Actualización Tributaria (más intangibles, llave y terrenos) que
 * agrupan las clases de activos. Cada uno lleva su tope de porcentaje en la configuración de la instalación.
 */
export const INCISOS_FISCALES = [
  'edificios',
  'plantaciones',
  'instalaciones_y_mobiliario',
  'maquinaria_y_vehiculos',
  'computo',
  'herramientas',
  'reproductores',
  'otros_muebles',
  'intangibles',
  'llave',
  'terrenos',
] as const;

export type IncisoFiscal = (typeof INCISOS_FISCALES)[number];

/** Los terrenos no se deprecian: porcentaje cero y sin vida útil. */
export const esTerreno = (inciso: IncisoFiscal): inciso is 'terrenos' => inciso === 'terrenos';

/** Los incisos que se deprecian o amortizan, o sea los que tienen un tope de ley en la configuración. */
export type IncisoConTope = Exclude<IncisoFiscal, 'terrenos'>;
export const INCISOS_CON_TOPE: readonly IncisoConTope[] = INCISOS_FISCALES.filter(
  (inciso): inciso is IncisoConTope => !esTerreno(inciso),
);

/** Clave de la configuración con el porcentaje máximo de un inciso. */
export const claveDelTope = (inciso: IncisoFiscal): string => `activos-fijos.isr.maximo.${inciso}`;
