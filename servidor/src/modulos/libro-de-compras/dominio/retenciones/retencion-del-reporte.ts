import type { ImpuestoRetenido, ReglaDeRetencion } from '../retencion-propuesta.js';
import type { ConstanciaAnotada } from './constancia-de-retencion.js';
import { GRUPO_DE_ENTERO, claveDelGrupo, mesDeLaRetencion, type GrupoDeEntero } from './grupo-de-entero.js';
import type { ResolucionDeRetencion } from './resolucion-de-retencion.js';

/** Una retención con el documento y el proveedor de donde sale; los montos, en centavos. */
export interface RetencionDelReporte {
  id: string;
  impuesto: ImpuestoRetenido;
  regla: ReglaDeRetencion;
  base: number;
  /** En centésimas (5 % → 500); `null` en el ISR por escalones. */
  porcentaje: number | null;
  montoPropuesto: number;
  monto: number;
  motivoDelAjuste: string | null;
  fecha: string;
  constancia: ConstanciaAnotada | null;
  resolucion: ResolucionDeRetencion | null;
  notaDeResolucion: string | null;
  resueltaEn: string | null;
  resueltaPor: string | null;
  documento: {
    id: string;
    estado: 'vigente' | 'anulado';
    tipoDte: string | null;
    serie: string | null;
    numero: string;
    autorizacionFel: string | null;
    fechaEmision: string;
    motivoDeAnulacion: string | null;
  };
  proveedor: { id: string; nit: string | null; nombre: string };
}

/** Un pago de las retenciones de un mes y grupo, tal como se guardó; los montos, en centavos. */
export interface EnteroGuardado {
  id: string;
  mes: string;
  grupo: GrupoDeEntero;
  fechaDePago: string;
  documentoDePago: string;
  monto: number;
  retenidoAlMarcar: number;
  observaciones: string | null;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  registradoPor: string | null;
}

/** Cuánto hay y de cuántas retenciones. */
export interface Cantidad {
  cantidad: number;
  monto: number;
}

export interface ResumenDeRegla {
  regla: ReglaDeRetencion;
  impuesto: ImpuestoRetenido;
  cantidad: number;
  base: number;
  retenido: number;
}

/** Lo retenido en un mes y grupo por documentos vigentes (las retenciones en cero no cuentan). */
export interface ResumenDelGrupo {
  mes: string;
  grupo: GrupoDeEntero;
  retenido: number;
  reglas: ResumenDeRegla[];
  conConstancia: Cantidad;
  sinConstancia: Cantidad;
}

const vacio = (mes: string, grupo: GrupoDeEntero): ResumenDelGrupo => ({
  mes,
  grupo,
  retenido: 0,
  reglas: [],
  conConstancia: { cantidad: 0, monto: 0 },
  sinConstancia: { cantidad: 0, monto: 0 },
});

function sumarARegla(resumen: ResumenDelGrupo, retencion: RetencionDelReporte): void {
  let regla = resumen.reglas.find((existente) => existente.regla === retencion.regla);
  if (!regla) {
    regla = { regla: retencion.regla, impuesto: retencion.impuesto, cantidad: 0, base: 0, retenido: 0 };
    resumen.reglas.push(regla);
  }
  regla.cantidad += 1;
  regla.base += retencion.base;
  regla.retenido += retencion.monto;
}

function sumar(resumen: ResumenDelGrupo, retencion: RetencionDelReporte): void {
  const parte = retencion.constancia ? resumen.conConstancia : resumen.sinConstancia;
  parte.cantidad += 1;
  parte.monto += retencion.monto;
  resumen.retenido += retencion.monto;
  sumarARegla(resumen, retencion);
}

/** Lo retenido por mes y grupo: solo documentos vigentes y retenciones con monto mayor que cero. */
export function resumirPorGrupo(retenciones: readonly RetencionDelReporte[]): Map<string, ResumenDelGrupo> {
  const resumenes = new Map<string, ResumenDelGrupo>();
  for (const retencion of retenciones) {
    if (retencion.documento.estado !== 'vigente' || retencion.monto <= 0) continue;
    const mes = mesDeLaRetencion(retencion.fecha);
    const grupo = GRUPO_DE_ENTERO[retencion.regla];
    const clave = claveDelGrupo(mes, grupo);
    if (!resumenes.has(clave)) resumenes.set(clave, vacio(mes, grupo));
    sumar(resumenes.get(clave)!, retencion);
  }
  return resumenes;
}

/** Lo pagado en un mes y grupo: la suma de los pagos vigentes. */
export function pagadoDe(pagos: readonly EnteroGuardado[], mes: string, grupo: GrupoDeEntero): number {
  return pagos
    .filter((pago) => pago.estado === 'vigente' && pago.mes === mes && pago.grupo === grupo)
    .reduce((suma, pago) => suma + pago.monto, 0);
}

/** `true` si el mes y grupo tiene algún pago vigente. */
export const tieneEnteroVigente = (pagos: readonly EnteroGuardado[], mes: string, grupo: GrupoDeEntero): boolean =>
  pagos.some((pago) => pago.estado === 'vigente' && pago.mes === mes && pago.grupo === grupo);

export const resumenVacio = vacio;

/** Lo retenido por mes y grupo a partir de las sumas por mes y regla; la clave es `claveDelGrupo`. */
export function retenidoPorGrupo(
  sumas: ReadonlyArray<{ mes: string; regla: ReglaDeRetencion; monto: number }>,
): Map<string, number> {
  const retenido = new Map<string, number>();
  for (const { mes, regla, monto } of sumas) {
    const clave = claveDelGrupo(mes, GRUPO_DE_ENTERO[regla]);
    retenido.set(clave, (retenido.get(clave) ?? 0) + monto);
  }
  return retenido;
}
