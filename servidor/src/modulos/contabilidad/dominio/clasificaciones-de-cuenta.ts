export const NATURALEZAS = ['deudora', 'acreedora'] as const;
export type Naturaleza = (typeof NATURALEZAS)[number];

export const TIPOS_DE_CUENTA = ['balance', 'resultados'] as const;

/** Para el flujo de efectivo indirecto. */
export const CLASES_DE_FLUJO = ['efectivo', 'operacion', 'inversion', 'financiamiento', 'ninguna'] as const;
export type ClaseDeFlujo = (typeof CLASES_DE_FLUJO)[number];

/**
 * Cómo trata la ley del ISR a la cuenta de resultados (LAT arts. 23 y título IV). `costo_de_renta_exenta`: costos y
 * gastos de rentas exentas o no afectas; `renta_de_capital`: intereses, dividendos y su ISR.
 */
export const TRATAMIENTOS_FISCALES = [
  'deducible',
  'no_deducible',
  'exento',
  'costo_de_renta_exenta',
  'renta_de_capital',
  'no_aplica',
] as const;
export type TratamientoFiscal = (typeof TRATAMIENTOS_FISCALES)[number];

export const NOMBRES_DE_NATURALEZA: Record<Naturaleza, string> = { deudora: 'Deudora', acreedora: 'Acreedora' };

export const NOMBRES_DE_CLASE_DE_FLUJO: Record<ClaseDeFlujo, string> = {
  efectivo: 'Efectivo',
  operacion: 'Operación',
  inversion: 'Inversión',
  financiamiento: 'Financiamiento',
  ninguna: 'Ninguna',
};

export const NOMBRES_DE_TRATAMIENTO: Record<TratamientoFiscal, string> = {
  deducible: 'Deducible',
  no_deducible: 'No deducible',
  exento: 'Exento',
  costo_de_renta_exenta: 'Costo de renta exenta',
  renta_de_capital: 'Renta de capital',
  no_aplica: 'No aplica',
};
