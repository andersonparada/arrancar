import type { MotivoSinCredito } from '../tipos-de-documento.js';

/** El código corto con que el libro marca por qué un documento no da crédito. */
export const SIGLA_DEL_MOTIVO: Record<MotivoSinCredito, string> = {
  fuera_de_plazo: 'FP',
  no_vinculado: 'NV',
  empresa_sin_credito: 'ESC',
  nota_de_debito_tardia: 'NDT',
  pequeno_contribuyente: 'PC',
  contribuyente_agropecuario: 'RE',
  primario_pecuario: 'RE',
  exento: 'EX',
};

/** La leyenda que va al final del libro. */
export const LEYENDA_DE_MOTIVOS: ReadonlyArray<{ sigla: string; descripcion: string }> = [
  { sigla: 'FP', descripcion: 'Fuera de plazo para el crédito fiscal (art. 20 de la Ley del IVA)' },
  { sigla: 'NV', descripcion: 'No vinculado a operaciones gravadas' },
  { sigla: 'ESC', descripcion: 'Empresa sin crédito fiscal en el período' },
  { sigla: 'NDT', descripcion: 'Nota de débito tardía (art. 17 de la Ley del IVA)' },
  { sigla: 'PC', descripcion: 'Proveedor pequeño contribuyente' },
  { sigla: 'RE', descripcion: 'Proveedor del régimen agropecuario, primario o pecuario (sin IVA)' },
  { sigla: 'EX', descripcion: 'Compra exenta' },
];
