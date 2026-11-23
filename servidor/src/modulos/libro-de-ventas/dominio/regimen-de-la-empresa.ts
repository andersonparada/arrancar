import { RegimenDerogado } from './errores-de-documento.js';
import { FAMILIAS_DEROGADAS, type TipoDeDocumento } from './tipos-de-documento.js';

export const REGIMENES_DE_IVA = [
  'general',
  'pequeno_contribuyente',
  'pequeno_contribuyente_electronico',
  'contribuyente_agropecuario',
  'primario_pecuario',
  'no_afiliado',
] as const;
export type RegimenDeIva = (typeof REGIMENES_DE_IVA)[number];

export const REGIMENES_DE_ISR = ['utilidades', 'opcional_simplificado', 'exento'] as const;
export type RegimenDeIsr = (typeof REGIMENES_DE_ISR)[number];

/** El régimen de la empresa en el mes del documento, tal como lo dice su historial fiscal. */
export interface RegimenDelMes {
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsr | null;
}

/** Los regímenes que el Decreto 31-2024 derogó: no se admiten desde la fecha de derogación. */
const REGIMENES_DEROGADOS: readonly RegimenDeIva[] = [
  'pequeno_contribuyente_electronico',
  'contribuyente_agropecuario',
];

const NOTAS: readonly TipoDeDocumento[] = ['nota_de_credito', 'nota_de_debito', 'nota_de_abono'];

/** Los tipos que emite cada régimen (§3.4); la factura especial recibida va aparte, con su propio aviso. */
const FAMILIAS_DEL_REGIMEN: Record<RegimenDeIva, readonly TipoDeDocumento[]> = {
  general: ['factura', 'factura_cambiaria', 'recibo', ...NOTAS],
  pequeno_contribuyente: ['factura_pequeno_contribuyente', ...NOTAS],
  pequeno_contribuyente_electronico: ['factura_pequeno_contribuyente_electronico', ...NOTAS],
  contribuyente_agropecuario: ['factura_contribuyente_agropecuario', ...NOTAS],
  primario_pecuario: ['factura_primario_pecuario', ...NOTAS],
  no_afiliado: ['recibo'],
};

const NOMBRE_DEL_REGIMEN: Record<RegimenDeIva, string> = {
  general: 'general del IVA',
  pequeno_contribuyente: 'pequeño contribuyente',
  pequeno_contribuyente_electronico: 'pequeño contribuyente electrónico',
  contribuyente_agropecuario: 'contribuyente agropecuario',
  primario_pecuario: 'primario y pecuario',
  no_afiliado: 'no afiliado al IVA',
};

/**
 * Solo el régimen general carga débito fiscal (y la factura especial que el comprador le emite a cualquier empresa:
 * ese IVA lo retiene él). El recibo y la nota de abono nunca llevan IVA: no son hechos generadores ni rebajan el débito.
 */
export function cobraIva(regimen: RegimenDeIva, tipo: TipoDeDocumento): boolean {
  if (tipo === 'recibo' || tipo === 'nota_de_abono') return false;
  return tipo === 'factura_especial_recibida' || regimen === 'general';
}

/**
 * El régimen derogado, o un documento de una familia derogada, desde la fecha de derogación (variable de instalación
 * `libro-de-compras.regimenes.fecha_de_derogacion`) ya no se registra; antes de ella sí (histórico).
 * @throws RegimenDerogado
 */
export function exigirRegimenVigente(
  datos: { regimenIva: RegimenDeIva; tipo: TipoDeDocumento; fechaDeEmision: string },
  fechaDeDerogacion: string,
): void {
  if (datos.fechaDeEmision < fechaDeDerogacion) return;
  if (REGIMENES_DEROGADOS.includes(datos.regimenIva) || FAMILIAS_DEROGADAS.includes(datos.tipo)) {
    throw new RegimenDerogado();
  }
}

export const AVISO_DE_EMPRESA_INSCRITA =
  'Su empresa está inscrita en el IVA: debe emitir su propia factura (Ley del IVA art. 52). Revise con su contador.';

/** Avisos (que no bloquean) de que la familia no es la que corresponde al régimen del mes, o de la factura especial. */
export function avisosDeFamiliaContraRegimen(regimen: RegimenDeIva, tipo: TipoDeDocumento): string[] {
  if (tipo === 'factura_especial_recibida') return regimen === 'no_afiliado' ? [] : [AVISO_DE_EMPRESA_INSCRITA];
  if (FAMILIAS_DEL_REGIMEN[regimen].includes(tipo)) return [];
  return [
    `Este tipo de documento no corresponde al régimen de la empresa en ese mes (${NOMBRE_DEL_REGIMEN[regimen]}): revise sus datos fiscales.`,
  ];
}
