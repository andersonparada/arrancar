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
const DEROGADO = '(derogado en 2025, solo para períodos anteriores)';

export const REGIMENES_DE_IVA = {
  contribuyente_agropecuario: `Contribuyente agropecuario ${DEROGADO}`,
  general: 'General',
  no_afiliado: 'No afiliado al IVA',
  pequeno_contribuyente: 'Pequeño contribuyente',
  pequeno_contribuyente_electronico: `Pequeño contribuyente electrónico ${DEROGADO}`,
  primario_pecuario: 'Primario pecuario',
} as const;

/** Una línea de ayuda debajo del régimen de IVA escogido. */
export const AYUDA_DE_REGIMEN_DE_IVA = {
  contribuyente_agropecuario:
    'Solo persona individual. Ya no existe desde julio de 2025: sirve para registrar períodos anteriores.',
  general: 'Paga el IVA de sus ventas menos el de sus compras (crédito fiscal).',
  no_afiliado: 'No está afiliada al IVA: no cobra IVA ni lo acredita.',
  pequeno_contribuyente: 'Paga una cuota sobre sus ventas; el IVA de sus compras no le da crédito.',
  pequeno_contribuyente_electronico:
    'Ya no existe desde julio de 2025: sirve para registrar períodos anteriores. El IVA de sus compras no le da crédito.',
  primario_pecuario: 'Productor primario o pecuario con su régimen especial de IVA.',
} as const;

export const TIPOS_DE_PERSONA = {
  individual: 'Persona individual',
  juridica: 'Persona jurídica (sociedad, asociación…)',
} as const;

export const REGIMENES_DE_ISR_DE_EMPRESA = {
  exento: 'Exento (entidad exenta)',
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
  preguntaContabilidad: '¿Lleva contabilidad completa?',
  preguntaContabilidadAyuda:
    'Quien la lleva retiene ISR a los proveedores del régimen opcional simplificado (Decreto 10-2012, art. 47). Si duda, consulte a su contador.',
  agenteIsrAviso: 'Desmárquela solo si su contador lo confirma.',
  tipoDePersonaAyuda:
    'No cambia con el tiempo: es el mismo en todas las vigencias. Otro tipo de persona sería otro NIT.',
  isrNoAplicaAyuda: 'Con este régimen de IVA el ISR no aplica.',
  agenteIvaNoAplicaAyuda: 'Solo el régimen general puede ser agente de retención del IVA.',
  agenteIvaAyuda: 'Ninguno por omisión: el agente de retención del IVA lo califica la SAT.',
  seLeRetieneIsrAyuda: 'No se retiene si la factura dice «Sujeto a pago directo ISR».',
  productoAgropecuarioAyuda:
    'Solo productos en estado natural (café sin tostar, azúcar sin refinar, banano, cardamomo, leche, ganado…). Los insumos industrializados (concentrados, fertilizantes, medicinas) no lo son. Afecta la retención del 65 % de los exportadores.',
} as const;

/** La pregunta «¿Desde cuándo rigen estos datos?» y los avisos de la sección fiscal de la empresa. */
export const TEXTOS_DE_VIGENCIA = {
  pregunta: '¿Desde cuándo rigen estos datos?',
  primeraVez: 'Es la primera vez: estos datos regirán desde el inicio, para cualquier período anterior o posterior.',
  actual: 'Corregir lo registrado',
  actualAyuda: 'Los datos estaban mal: se corrigen en la vigencia que rige hoy y no se crea una nueva.',
  mes: 'Cambió a partir de un mes',
  mesAyuda: 'Lo anterior no se toca. Estos datos rigen desde el mes que escoja hasta la próxima vigencia que haya.',
  inicio: 'Desde el inicio',
  inicioAyuda: 'Rigen para todos los períodos, desde siempre, hasta el primer cambio que ya esté registrado.',
  elMes: 'Mes desde el que rigen',
} as const;

export const TEXTOS_DE_HISTORIAL = {
  titulo: 'Historial de vigencias',
  vacio: 'Todavía no se han guardado datos fiscales. Edite la empresa para definirlos.',
  vigente: 'vigente',
  desdeElInicio: 'Desde el inicio',
  base: 'Es la vigencia base: no se quita.',
  conDocumentos: 'Tiene facturas registradas: no se puede quitar.',
} as const;
