import { CostoDeActivoNegativo, CostoInvalido } from '../../../dominio/errores-de-costo.js';
import { exigirCapacidadDeLinea, exigirSignoDeLinea } from '../../../dominio/linea-capitalizable.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import type { ParteDeCosto, PlanDeCapitalizacion } from './plan-de-capitalizacion.js';

/** Suma `montoCentavos` de las partes por la llave que dé `clave`. */
function sumarPor(partes: readonly ParteDeCosto[], clave: (parte: ParteDeCosto) => string): Map<string, number> {
  const sumas = new Map<string, number>();
  for (const parte of partes) sumas.set(clave(parte), (sumas.get(clave(parte)) ?? 0) + parte.montoCentavos);
  return sumas;
}

/** Cada parte lleva el signo de su línea y los activos existentes admiten costos. */
function revisarPartes(plan: PlanDeCapitalizacion): void {
  for (const parte of plan.partes) {
    exigirSignoDeLinea(parte.linea, parte.montoCentavos);
    if (plan.existentes.has(parte.activo.id.valor)) parte.activo.exigirAdmiteCostos();
  }
}

/** La regla de la línea: lo ya capitalizado más lo nuevo no pasa de lo que costó (con las líneas ya bloqueadas). */
function revisarLineas(plan: PlanDeCapitalizacion): void {
  const nuevoPorLinea = sumarPor(plan.partes, (parte) => parte.linea.lineaId);
  for (const [lineaId, nuevo] of nuevoPorLinea) {
    const { linea } = plan.partes.find((parte) => parte.linea.lineaId === lineaId)!;
    exigirCapacidadDeLinea(linea, nuevo);
  }
}

/** La suma de los costos vigentes de un activo nunca queda negativa (V-6), con el activo ya bloqueado. */
async function revisarActivos(dependencias: DependenciasDeCostos, plan: PlanDeCapitalizacion): Promise<void> {
  const totales = await dependencias.costos.totalesVigentes([...plan.existentes.keys()]);
  const nuevoPorActivo = sumarPor(plan.partes, (parte) => parte.activo.id.valor);
  for (const [activoId, nuevo] of nuevoPorActivo) {
    const parte = plan.partes.find((p) => p.activo.id.valor === activoId)!;
    if ((totales.get(activoId) ?? 0) + nuevo < 0) throw new CostoDeActivoNegativo(parte.activo.instantanea().codigo);
  }
}

/** «No es edificación ni requiere licencia» solo se marca en los activos de clase edificios (§3.5.1). */
async function revisarEdificacion(plan: PlanDeCapitalizacion): Promise<void> {
  for (const parte of plan.partes.filter((p) => p.asignacion.noEsEdificacion)) {
    if ((await plan.incisoDe(parte.activo.instantanea().claseId)) !== 'edificios')
      throw new CostoInvalido('"No es edificación" solo se marca en los activos de la clase Edificios.');
  }
}

/**
 * Las reglas de dominio de una capitalización antes de guardar: signo de cada parte, regla de la línea, total del
 * activo nunca negativo y la marca de edificación.
 * @throws MontoDeCostoInvalido, LineaSobrecapitalizada, CostoDeActivoNegativo, CostoInvalido o el error del activo.
 */
export async function revisarPlan(dependencias: DependenciasDeCostos, plan: PlanDeCapitalizacion): Promise<void> {
  revisarPartes(plan);
  revisarLineas(plan);
  await revisarActivos(dependencias, plan);
  await revisarEdificacion(plan);
}
