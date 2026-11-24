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

/** Las familias que llevan débito fiscal: la factura y la cambiaria (y la especial, cuyo IVA retiene el comprador). */
const FAMILIAS_CON_IVA: readonly TipoDeDocumento[] = ['factura', 'factura_cambiaria', 'factura_especial_recibida'];

/**
 * El IVA sale de la familia del documento, no del régimen del mes: la SAT ya certificó el DTE y un régimen mal cargado
 * solo da un aviso (§3.4). Llevan IVA la factura, la cambiaria y la especial; las facturas de pequeño contribuyente,
 * agropecuario y primario, el recibo y la nota de abono no. La nota de crédito o de débito hereda el tratamiento de la
 * factura que corrige (`tipoDeLaFactura`); si la factura es del sistema anterior (no se conoce su familia) lo decide
 * `tratamientoDeLaNotaSobreFacturaAnterior`.
 */
export function cobraIva(datos: {
  regimen: RegimenDeIva;
  tipo: TipoDeDocumento;
  tipoDeLaFactura: TipoDeDocumento | null;
}): boolean {
  const { regimen, tipo, tipoDeLaFactura } = datos;
  if (tipo === 'nota_de_abono') return false;
  if (tipo === 'nota_de_credito' || tipo === 'nota_de_debito') {
    return tipoDeLaFactura ? FAMILIAS_CON_IVA.includes(tipoDeLaFactura) : regimen === 'general';
  }
  return FAMILIAS_CON_IVA.includes(tipo);
}

export const AVISO_DE_IVA_DE_LA_FACTURA_ANTERIOR_SIN_HISTORIAL =
  'No hay historial fiscal del mes de la factura del sistema anterior: el IVA de la nota se calculó con el régimen del mes de la nota. Revise el IVA.';

export const AVISO_DE_IVA_QUE_NO_CONCUERDA_CON_LA_FACTURA_ANTERIOR =
  'El IVA del DTE no concuerda con el régimen de la empresa en el mes de la factura del sistema anterior; se respetó el del DTE. Revise sus datos fiscales.';

/**
 * El IVA de una nota sobre una factura del sistema anterior, de la que solo se conoce la fecha. El IVA que dice el DTE
 * manda (la SAT ya lo certificó); si el DTE no lo dice, se usa el régimen de la empresa en el mes de la factura (solo el
 * general carga IVA), y sin historial de ese mes, el del mes de la nota. Lo dudoso da un aviso, nunca un bloqueo (§3.4).
 */
export function tratamientoDeLaNotaSobreFacturaAnterior(datos: {
  ivaDelDte: number | null;
  regimenDeLaFactura: RegimenDeIva | null;
  regimenDelMesDeLaNota: RegimenDeIva;
}): { cobraIva: boolean; avisos: string[] } {
  const { ivaDelDte, regimenDeLaFactura, regimenDelMesDeLaNota } = datos;
  if (ivaDelDte !== null) {
    const cobraIva = ivaDelDte > 0;
    const concuerda = regimenDeLaFactura === null || (regimenDeLaFactura === 'general') === cobraIva;
    return { cobraIva, avisos: concuerda ? [] : [AVISO_DE_IVA_QUE_NO_CONCUERDA_CON_LA_FACTURA_ANTERIOR] };
  }
  if (regimenDeLaFactura !== null) return { cobraIva: regimenDeLaFactura === 'general', avisos: [] };
  return {
    cobraIva: regimenDelMesDeLaNota === 'general',
    avisos: [AVISO_DE_IVA_DE_LA_FACTURA_ANTERIOR_SIN_HISTORIAL],
  };
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
