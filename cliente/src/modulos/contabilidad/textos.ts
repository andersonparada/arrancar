/** Nombres de las ventanas y del menú del módulo Contabilidad. */

export const NOMBRE_CONTABILIDAD = 'Contabilidad';

export const VENTANAS_CONTABILIDAD = {
  inicio: {
    titulo: 'Inicio de la contabilidad',
    descripcion: 'Desde cuándo lleva contabilidad la empresa, cómo se escriben los códigos de cuenta y quién firma.',
  },
  nomenclatura: {
    titulo: 'Nomenclatura',
    descripcion: 'El catálogo de cuentas de la empresa, en árbol. Solo las cuentas de detalle reciben movimientos.',
  },
  enlaces: {
    titulo: 'Enlaces contables',
    descripcion: 'Qué cuenta usa la contabilidad para cada hecho de los demás módulos (compras, pagos, bancos…).',
  },
} as const;

export const NATURALEZAS = { deudora: 'Deudora', acreedora: 'Acreedora' } as const;

export const TIPOS_DE_CUENTA = { balance: 'Balance', resultados: 'Resultados' } as const;

export const CLASES_DE_FLUJO = {
  efectivo: 'Efectivo',
  operacion: 'Operación',
  inversion: 'Inversión',
  financiamiento: 'Financiamiento',
  ninguna: 'Ninguna',
} as const;

export const TRATAMIENTOS_FISCALES = {
  no_aplica: 'No aplica',
  deducible: 'Deducible',
  no_deducible: 'No deducible',
  exento: 'Exento',
  costo_de_renta_exenta: 'Costo de renta exenta o no afecta',
  renta_de_capital: 'Renta de capital (intereses, dividendos)',
} as const;
