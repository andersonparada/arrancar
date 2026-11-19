import { Costo } from '../../../dominio/costo.js';
import { CostoDeActivoNegativo, CostoInvalido, LineaNoCapitalizable } from '../../../dominio/errores-de-costo.js';
import { MejoraSinCostoNeto } from '../../../dominio/errores-de-mejora.js';
import {
  claseDeCostoDeLinea,
  exigirCapacidadDeLinea,
  exigirCapitalizable,
  exigirSignoDeLinea,
  type LineaCapitalizable,
} from '../../../dominio/linea-capitalizable.js';
import type { Mejora } from '../../../dominio/mejora.js';
import type { LineaDeMejora, SolicitudDeMejora } from '../../dto/mejora.dto.js';
import type { DependenciasDeMejoras } from './dependencias-de-mejoras.js';

/** Toma el candado de las líneas y recién entonces las lee: lo capitalizado que ve es lo verdadero. */
async function lineasBloqueadas(
  { costos, lineas }: DependenciasDeMejoras,
  pedidas: readonly LineaDeMejora[],
): Promise<Map<string, LineaCapitalizable>> {
  const ids = pedidas.map(({ lineaId }) => lineaId);
  await costos.bloquearLineas(ids);
  const encontradas = new Map((await lineas.buscar([...new Set(ids)])).map((linea) => [linea.lineaId, linea]));
  for (const id of ids) {
    const linea = encontradas.get(id);
    if (!linea) throw new LineaNoCapitalizable('La línea no existe en el libro de compras de la empresa.');
    exigirCapitalizable(linea);
  }
  return encontradas;
}

/** Cada parte lleva el signo de su línea y, juntas, no pasan de lo que la línea costó (la regla de la línea). */
function revisarLineas(pedidas: readonly LineaDeMejora[], lineas: ReadonlyMap<string, LineaCapitalizable>): void {
  const nuevoPorLinea = new Map<string, number>();
  for (const { lineaId, montoCentavos } of pedidas) {
    exigirSignoDeLinea(lineas.get(lineaId)!, montoCentavos);
    nuevoPorLinea.set(lineaId, (nuevoPorLinea.get(lineaId) ?? 0) + montoCentavos);
  }
  for (const [lineaId, nuevo] of nuevoPorLinea) exigirCapacidadDeLinea(lineas.get(lineaId)!, nuevo);
}

function costosDeLineas(
  mejora: Mejora,
  pedidas: readonly LineaDeMejora[],
  lineas: ReadonlyMap<string, LineaCapitalizable>,
): Costo[] {
  const { empresaId, activoId, id, noEsEdificacion } = mejora.instantanea();
  return pedidas.map(({ lineaId, montoCentavos, claseDeCosto }) => {
    const linea = lineas.get(lineaId)!;
    return Costo.deLinea({
      empresaId,
      activoId,
      linea,
      claseDeCosto: claseDeCostoDeLinea(linea, claseDeCosto),
      montoCentavos,
      noEsEdificacion,
      mejoraId: id.valor,
    });
  });
}

function costosManuales(mejora: Mejora, solicitud: SolicitudDeMejora): Costo[] {
  const { empresaId, activoId, id, fecha, noEsEdificacion } = mejora.instantanea();
  return solicitud.costosManuales.map((manual) =>
    Costo.manual(empresaId, activoId, { ...manual, fecha, noEsEdificacion, mejoraId: id.valor }),
  );
}

/** Una mejora suma; un costo posterior puede restar (nota de crédito) pero no quedar en cero. */
function exigirCostoNeto(mejora: Mejora, nuevos: readonly Costo[]): number {
  const neto = nuevos.reduce((suma, costo) => suma + costo.instantanea().montoCentavos, 0);
  if (nuevos.length === 0) throw new CostoInvalido('Agregue al menos un costo a la mejora.');
  if (mejora.instantanea().clase === 'mejora' && neto <= 0)
    throw new MejoraSinCostoNeto('Una mejora suma costo: los costos que agrega deben dar más de cero.');
  if (neto === 0) throw new MejoraSinCostoNeto('Los costos del costo posterior suman cero: no hay nada que registrar.');
  return neto;
}

/** La mejora, lo que pidió el usuario y el código del activo (para los mensajes). */
export interface PedidoDeCostos {
  mejora: Mejora;
  solicitud: SolicitudDeMejora;
  codigoDelActivo: string;
}

/**
 * Arma los costos de la mejora, de líneas del libro (con su candado y la regla de la línea) y escritos a mano, y
 * revisa que su suma tenga sentido y que el activo no quede con costo negativo (V-6).
 * @throws LineaNoCapitalizable, LineaDescartada, MontoDeCostoInvalido, LineaSobrecapitalizada, CostoInvalido,
 * MejoraSinCostoNeto o CostoDeActivoNegativo.
 */
export async function armarCostosDeMejora(
  dependencias: DependenciasDeMejoras,
  { mejora, solicitud, codigoDelActivo }: PedidoDeCostos,
): Promise<Costo[]> {
  const lineas = await lineasBloqueadas(dependencias, solicitud.lineas);
  revisarLineas(solicitud.lineas, lineas);
  const nuevos = [...costosDeLineas(mejora, solicitud.lineas, lineas), ...costosManuales(mejora, solicitud)];
  const neto = exigirCostoNeto(mejora, nuevos);
  const { activoId } = mejora.instantanea();
  const actual = (await dependencias.costos.totalesVigentes([activoId])).get(activoId) ?? 0;
  if (actual + neto < 0) throw new CostoDeActivoNegativo(codigoDelActivo);
  return nuevos;
}
