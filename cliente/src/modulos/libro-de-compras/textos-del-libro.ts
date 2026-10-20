import type { MotivoSinCredito } from './servicios/documentos.api';
import type { TipoDeLibro } from './servicios/libro.api';

export const VENTANA_DEL_LIBRO = {
  titulo: 'Libro de compras',
  descripcion: 'Las compras del mes, listas para revisar y llevar al contador.',
  anulados: 'Anulados del período',
  libro: 'Libro del período',
  exportar: 'Exportar a Excel',
  borrador: 'Ver borrador (PDF)',
  borradorAyuda: 'El borrador no lleva número de folio y no gasta hojas.',
  emitir: 'Emitir con folios',
  corregirFolio: 'Corregir el último folio',
} as const;

export const EMISIONES_DEL_LIBRO = {
  titulo: 'Emisiones del período',
  vacio: 'Este período todavía no se ha emitido con folios.',
  vacioAyuda: 'Revise el borrador y, cuando esté listo, use «Emitir con folios».',
  copia: 'Descargar copia',
  copiaAyuda: 'La copia es el mismo archivo con los mismos folios: no gasta hojas.',
  sustituida: 'Sustituida',
  vigente: 'Vigente',
  ultimoFolio: 'Último folio usado',
  sinFolios: 'Ninguno todavía',
} as const;

export const VENTANA_DE_EMISION = {
  titulo: 'Emitir el libro con folios',
  motivo: 'Motivo de la nueva emisión',
  motivoAyuda: 'Este período ya se emitió. Explique por qué lo emite otra vez (por ejemplo, se corrigió un documento).',
  confirmar: 'Emitir y gastar folios',
  cancelar: 'Cancelar',
} as const;

export const VENTANA_DE_FOLIO = {
  titulo: 'Corregir el último folio',
  explicacion:
    'Úselo cuando las hojas habilitadas en la SAT no coinciden con las que Arrancar tiene contadas: por ejemplo, si la empresa viene de otro sistema o de hojas usadas a mano. La siguiente emisión empezará en el folio siguiente al que escriba.',
  folio: 'Último folio usado',
  folioAyuda: 'Escriba 0 si no ha usado ninguna hoja. No puede ser menor que lo ya emitido en Arrancar.',
  motivo: 'Motivo de la corrección',
  guardar: 'Guardar folio',
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
