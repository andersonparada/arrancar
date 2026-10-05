/** Nombres de las ventanas y del menú del módulo Libro de compras, y de las opciones de sus datos fiscales. */

export const NOMBRE_LIBRO_DE_COMPRAS = 'Libro de compras';

export const VENTANAS_LIBRO_DE_COMPRAS = {
  conceptosDeGasto: {
    titulo: 'Conceptos de gasto',
    descripcion: 'Los rubros en que se clasifican las compras de la empresa.',
    nuevo: 'Nuevo concepto de gasto',
    editar: 'Editar concepto de gasto',
  },
  combustibles: {
    titulo: 'Combustibles',
    descripcion: 'Los combustibles que compra la empresa y la historia de su tasa de IDP por galón.',
    nuevo: 'Nuevo combustible',
    editar: 'Editar combustible',
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

/** Textos y avisos de los datos fiscales. */
export const TEXTOS_FISCALES = {
  agenteIsrEtiqueta: 'Lleva contabilidad completa (agente de retención del ISR)',
  agenteIsrAyuda:
    'Por ley (Decreto 10-2012, art. 47), quien lleva contabilidad completa —toda sociedad— retiene ISR a los proveedores del régimen opcional simplificado. No requiere calificación de la SAT.',
  agenteIsrAviso: 'Desmárquela solo si su contador lo confirma.',
  agenteIvaAyuda: 'Ninguno por omisión: el agente de retención del IVA lo califica la SAT.',
  seLeRetieneIsrAyuda: 'No se retiene si la factura dice «Sujeto a pago directo ISR».',
  productoAgropecuarioAyuda:
    'Solo productos en estado natural (café sin tostar, azúcar sin refinar, banano, cardamomo, leche, ganado…). Los insumos industrializados (concentrados, fertilizantes, medicinas) no lo son. Afecta la retención del 65 % de los exportadores.',
} as const;
