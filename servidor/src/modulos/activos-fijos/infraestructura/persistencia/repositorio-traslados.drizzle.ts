import { and, asc, desc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTraslados, UbicacionRegistrada } from '../../aplicacion/puertos/repositorio-traslados.js';
import type { Traslado } from '../../dominio/traslado.js';
import { enTandas } from './en-tandas.js';
import { horaReal } from './hora-real.js';
import { mapeadorDeTraslado } from './traslado.mapeador.js';
import { traslados } from './traslados.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTrasladosDrizzle implements RepositorioTraslados {
  async agregarVarios(nuevos: readonly Traslado[]): Promise<void> {
    for (const tanda of enTandas(nuevos))
      await transaccionEnCurso()
        .insert(traslados)
        .values(tanda.map((traslado) => ({ ...mapeadorDeTraslado.aFila(traslado), creadoEn: horaReal() })));
  }

  async delGrupo(grupoId: string): Promise<Traslado[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(traslados)
      .where(eq(traslados.grupoId, grupoId))
      .orderBy(asc(traslados.id));
    return filas.map((fila) => mapeadorDeTraslado.aEntidad(fila));
  }

  async delGrupoBloqueando(grupoId: string): Promise<Traslado[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(traslados)
      .where(eq(traslados.grupoId, grupoId))
      .orderBy(asc(traslados.id))
      .for('share');
    return filas.map((fila) => mapeadorDeTraslado.aEntidad(fila));
  }

  async guardar(traslado: Traslado): Promise<void> {
    const { anuladoEn, anuladoPor, motivoDeAnulacion, estado } = mapeadorDeTraslado.aFila(traslado);
    await transaccionEnCurso()
      .update(traslados)
      .set({ estado, anuladoEn, anuladoPor, motivoDeAnulacion })
      .where(eq(traslados.id, traslado.id.valor));
  }

  async recientesDeActivo(activoId: string, cantidad: number): Promise<UbicacionRegistrada[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(traslados)
      .where(and(eq(traslados.activoId, activoId), eq(traslados.estado, 'vigente')))
      .orderBy(desc(traslados.fecha), desc(traslados.creadoEn), asc(traslados.esAlta))
      .limit(cantidad);
    return filas.map((fila) => ({
      trasladoId: fila.id,
      fecha: fila.fecha,
      localidadId: fila.localidadId,
      departamentoId: fila.departamentoId,
      responsable: fila.responsable,
      aBodega: fila.aBodega,
    }));
  }
}
