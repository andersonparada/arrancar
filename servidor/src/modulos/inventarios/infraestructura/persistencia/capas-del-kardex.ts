import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { DerivadoDePeps } from '../../aplicacion/puertos/almacen-del-kardex.js';
import type { CapaDelRecorrido, ConsumoDelRecorrido } from '../../dominio/costeo/cambios-del-recorrido.js';
import { deCentavosEnteros, deDiezmilesimas } from '../../dominio/decimales.js';
import { capas, consumosDeCapas } from './capas.tablas.js';
import { enTandas } from './en-tandas.js';

/** Inserta las capas y devuelve el id de cada una por el movimiento de su entrada. */
async function insertarCapas(articuloId: string, nuevas: readonly CapaDelRecorrido[]): Promise<Map<string, string>> {
  const idDeCapa = new Map<string, string>();
  for (const tanda of enTandas(nuevas)) {
    const filas = await transaccionEnCurso()
      .insert(capas)
      .values(
        tanda.map((c) => ({
          empresaId: deLaTransaccion.empresa(),
          articuloId,
          movimientoDeEntradaId: c.movimientoDeEntradaId,
          fecha: c.fecha,
          secuencia: c.secuencia,
          cantidadInicial: deDiezmilesimas(c.cantidadInicial),
          valorInicial: deCentavosEnteros(c.valorInicial),
          cantidadRestante: deDiezmilesimas(c.cantidadRestante),
          valorRestante: deCentavosEnteros(c.valorRestante),
        })),
      )
      .returning({ id: capas.id, entrada: capas.movimientoDeEntradaId });
    for (const fila of filas) idDeCapa.set(fila.entrada, fila.id);
  }
  return idDeCapa;
}

async function insertarConsumos(consumos: readonly ConsumoDelRecorrido[], idDeCapa: Map<string, string>) {
  for (const tanda of enTandas(consumos)) {
    await transaccionEnCurso()
      .insert(consumosDeCapas)
      .values(
        tanda.map((c) => ({
          empresaId: deLaTransaccion.empresa(),
          movimientoDeSalidaId: c.movimientoDeSalidaId,
          capaId: idDeCapa.get(c.movimientoDeEntradaId)!,
          cantidad: deDiezmilesimas(c.cantidad),
          valor: deCentavosEnteros(c.valor),
        })),
      );
  }
}

/** Borra las capas del artículo (sus consumos se van con ellas) y las vuelve a crear con lo que dejó el recorrido. */
export async function reemplazarCapasDelArticulo(articuloId: string, derivado: DerivadoDePeps): Promise<void> {
  await transaccionEnCurso().delete(capas).where(eq(capas.articuloId, articuloId));
  const idDeCapa = await insertarCapas(articuloId, derivado.capas);
  await insertarConsumos(derivado.consumos, idDeCapa);
}
