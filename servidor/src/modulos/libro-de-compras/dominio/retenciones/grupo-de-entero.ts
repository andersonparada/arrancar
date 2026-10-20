import type { CalendarioLaboral } from '../calendario-laboral.js';
import { primerDiaDelMes } from '../periodo-del-libro.js';
import { fechaLimiteDeEntero, ULTIMO_DIA_HABIL } from '../plazo-de-entero.js';
import type { ReglaDeRetencion } from '../retencion-propuesta.js';

/** Las retenciones se enteran juntas por mes y grupo (formulario y plazo propios). */
export const GRUPOS_DE_ENTERO = [
  'iva_agentes',
  'isr_opcional',
  'iva_factura_especial',
  'isr_factura_especial',
] as const;
export type GrupoDeEntero = (typeof GRUPOS_DE_ENTERO)[number];

/** A qué grupo de entero pertenece cada regla; una prueba recorre todas las reglas del check de la tabla. */
export const GRUPO_DE_ENTERO: Record<ReglaDeRetencion, GrupoDeEntero> = {
  iva_exportador_agropecuario: 'iva_agentes',
  iva_exportador: 'iva_agentes',
  iva_contribuyente_especial: 'iva_agentes',
  iva_otro_agente: 'iva_agentes',
  iva_sector_publico: 'iva_agentes',
  iva_pequeno_contribuyente: 'iva_agentes',
  isr_opcional_simplificado: 'isr_opcional',
  iva_factura_especial: 'iva_factura_especial',
  isr_factura_especial: 'isr_factura_especial',
};

export const NOMBRE_DEL_GRUPO: Record<GrupoDeEntero, string> = {
  iva_agentes: 'IVA de agentes de retención y pequeño contribuyente (5 %)',
  isr_opcional: 'ISR del régimen opcional simplificado',
  iva_factura_especial: 'IVA de facturas especiales',
  isr_factura_especial: 'ISR de facturas especiales',
};

/** El grupo conocido por su texto, o `null`. */
export const grupoDeEnteroValido = (texto: string): GrupoDeEntero | null =>
  GRUPOS_DE_ENTERO.find((grupo) => grupo === texto) ?? null;

/** Lo que hace falta para calcular el plazo de entero de un mes y grupo. */
export interface DatosDelPlazoDelGrupo {
  /** Primer día del mes de las retenciones. */
  mes: string;
  grupo: GrupoDeEntero;
  diasHabilesIva: number;
  diasHabilesIsr: number;
  calendario: CalendarioLaboral;
}

type DiasHabiles = number | typeof ULTIMO_DIA_HABIL;

const DIAS_HABILES: Record<GrupoDeEntero, (datos: DatosDelPlazoDelGrupo) => DiasHabiles> = {
  iva_agentes: (datos) => datos.diasHabilesIva,
  isr_opcional: (datos) => datos.diasHabilesIsr,
  iva_factura_especial: () => ULTIMO_DIA_HABIL,
  isr_factura_especial: (datos) => datos.diasHabilesIsr,
};

/** Último día para enterar lo retenido en el mes del grupo, según el calendario de feriados. */
export function plazoDelGrupo(datos: DatosDelPlazoDelGrupo): string {
  return fechaLimiteDeEntero({
    fechaDeLaRetencion: datos.mes,
    diasHabiles: DIAS_HABILES[datos.grupo](datos),
    calendario: datos.calendario,
  });
}

/** El mes (primer día) de una retención: el de su fecha. */
export const mesDeLaRetencion = (fecha: string): string => primerDiaDelMes(fecha);

/** La clave de un mes y grupo, para buscarlos en conjuntos y mapas. */
export const claveDelGrupo = (mes: string, grupo: GrupoDeEntero): string => `${mes}|${grupo}`;
