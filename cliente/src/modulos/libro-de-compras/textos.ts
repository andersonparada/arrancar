/** Nombres de las ventanas y del menú del módulo Libro de compras, y de las opciones de sus datos fiscales. */

export const NOMBRE_LIBRO_DE_COMPRAS = 'Libro de compras';

export const VENTANAS_LIBRO_DE_COMPRAS = {
  conceptosDeGasto: {
    titulo: 'Conceptos de gasto',
    descripcion: 'Los conceptos de gasto de la empresa.',
    nuevo: 'Nuevo concepto de gasto',
    editar: 'Editar concepto de gasto',
  },
  // generador: ventanas
} as const;

/** Título de las secciones que este módulo aporta a Empresas y Proveedores. */
export const TITULO_SECCION_FISCAL = 'Datos fiscales del libro de compras';

// Las listas van en orden de nombre, con la opción «ninguno» primero.
export const REGIMENES_DE_IVA = {
  general: 'General',
  pequeno_contribuyente: 'Pequeño contribuyente',
} as const;

export const REGIMENES_DE_ISR_DE_EMPRESA = {
  opcional_simplificado: 'Opcional simplificado sobre ingresos',
  utilidades: 'Sobre las utilidades',
} as const;

export const REGIMENES_DE_ISR_DE_PROVEEDOR = {
  no_domiciliado: 'No domiciliado',
  opcional_simplificado: 'Opcional simplificado sobre ingresos',
  utilidades: 'Sobre las utilidades',
} as const;

export const AGENTES_DE_RETENCION_DE_IVA = {
  ninguno: 'Ninguno',
  contribuyente_especial: 'Contribuyente especial',
  exportador: 'Exportador',
  otro: 'Otro (designado por la SAT o con contabilidad completa)',
  sector_publico: 'Sector público',
} as const;
