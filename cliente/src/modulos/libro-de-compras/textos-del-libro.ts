import type { MotivoSinCredito } from './servicios/documentos.api';
import type { TipoDeLibro } from './servicios/libro.api';

export const VENTANA_DEL_LIBRO = {
  titulo: 'Libro de compras',
  descripcion: 'Las compras del mes, listas para revisar y llevar al contador.',
  anulados: 'Anulados del período',
  libro: 'Libro del período',
  exportar: 'Exportar a Excel',
  pdf: 'PDF con folios',
  proximamente: 'Próximamente',
} as const;

/** Qué es cada tipo de libro, para el encabezado. */
export const DESCRIPCION_DEL_TIPO_DE_LIBRO: Record<TipoDeLibro, string> = {
  completo: 'Libro de compras y servicios',
  simplificado: 'Parte de compras del libro único del pequeño contribuyente',
};

export const AYUDA_DEL_TIPO_DE_LIBRO: Record<TipoDeLibro, string> = {
  completo: 'El IVA de las compras con derecho a crédito se separa del que va al costo o gasto.',
  simplificado: 'El IVA no se acredita: se muestra solo como información y va al costo o gasto.',
};

/** Nombre corto del motivo por el que un IVA no es crédito fiscal, para las tarjetas del resumen. */
export const MOTIVOS_CORTOS: Record<MotivoSinCredito, string> = {
  contribuyente_agropecuario: 'Proveedor agropecuario',
  empresa_sin_credito: 'Empresa sin crédito fiscal',
  exento: 'Compra exenta',
  fuera_de_plazo: 'Fuera de plazo',
  nota_de_debito_tardia: 'Nota de débito tardía',
  no_vinculado: 'No vinculado a operaciones gravadas',
  pequeno_contribuyente: 'Proveedor pequeño contribuyente',
  primario_pecuario: 'Proveedor primario o pecuario',
};

export const SIN_TIPO_DTE = 'Sin código de la SAT';
