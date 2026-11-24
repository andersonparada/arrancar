import { and, asc, eq, inArray, isNotNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioActivos } from '../../aplicacion/puertos/repositorio-activos.js';
import type { Activo, ActivoId } from '../../dominio/activo.js';
import { mapeadorDeActivo } from './activo.mapeador.js';
import { activos } from './activos.tablas.js';
import { bajas } from './bajas.tablas.js';
import { costos } from './costos.tablas.js';
import { mejoras } from './mejoras.tablas.js';
import { cuotas } from './cuotas.tablas.js';
import { divisiones } from './divisiones.tablas.js';
import { enTandas } from './en-tandas.js';
import { tramos } from './tramos.tablas.js';
import { traslados } from './traslados.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioActivosDrizzle implements RepositorioActivos {
  async buscar(id: ActivoId): Promise<Activo | null> {
    const [fila] = await transaccionEnCurso().select().from(activos).where(eq(activos.id, id.valor));
    return fila ? mapeadorDeActivo.aEntidad(fila) : null;
  }

  async agregar(activo: Activo): Promise<void> {
    await this.agregarVarios([activo]);
  }

  async agregarVarios(nuevos: readonly Activo[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    for (const tanda of enTandas(nuevos)) {
      await transaccion.insert(activos).values(tanda.map((activo) => mapeadorDeActivo.aFila(activo)));
      await transaccion.insert(traslados).values(tanda.map(filaDeAlta));
    }
  }

  async buscarBloqueando(ids: readonly string[]): Promise<Activo[]> {
    if (ids.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select()
      .from(activos)
      .where(inArray(activos.id, [...ids]))
      .orderBy(asc(activos.id))
      .for('update');
    return filas.map((fila) => mapeadorDeActivo.aEntidad(fila));
  }

  async componentesDe(ids: readonly string[]): Promise<Activo[]> {
    if (ids.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(and(inArray(activos.activoPadreId, [...ids]), ne(activos.estado, 'dado_de_baja')));
    const bloqueados = await this.buscarBloqueando(filas.map((fila) => fila.id));
    return bloqueados.sort((a, b) => a.instantanea().codigo.localeCompare(b.instantanea().codigo));
  }

  async vigentesDeAltaConjunta(altaConjuntaId: string): Promise<Activo[]> {
    const filas = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(and(eq(activos.altaConjuntaId, altaConjuntaId), ne(activos.estado, 'dado_de_baja')));
    const bloqueados = await this.buscarBloqueando(filas.map((fila) => fila.id));
    return bloqueados.sort((a, b) => a.instantanea().codigo.localeCompare(b.instantanea().codigo));
  }

  async guardar(activo: Activo): Promise<void> {
    await transaccionEnCurso()
      .update(activos)
      .set(mapeadorDeActivo.aFila(activo))
      .where(eq(activos.id, activo.id.valor));
  }

  async actualizarAlta(activo: Activo): Promise<void> {
    const { esAlta: _esAlta, empresaId: _empresaId, activoId: _activoId, ...cambios } = filaDeAlta(activo);
    await transaccionEnCurso()
      .update(traslados)
      .set(cambios)
      .where(and(eq(traslados.activoId, activo.id.valor), eq(traslados.esAlta, true)));
  }

  async eliminar(activo: Activo): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion.delete(tramos).where(eq(tramos.activoId, activo.id.valor));
    await transaccion.delete(costos).where(eq(costos.activoId, activo.id.valor));
    await transaccion.delete(traslados).where(eq(traslados.activoId, activo.id.valor));
    await transaccion.delete(activos).where(eq(activos.id, activo.id.valor));
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(sql`upper(${activos.codigo}) = upper(${codigo})`)
      .limit(1);
    return fila !== undefined;
  }

  async idPorCodigo(codigo: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(sql`upper(${activos.codigo}) = upper(${codigo.trim()})`)
      .limit(1);
    return fila?.id ?? null;
  }

  async codigosUsados(codigos: readonly string[]): Promise<Set<string>> {
    if (codigos.length === 0) return new Set();
    const mayusculas = sql<string>`upper(${activos.codigo})`;
    const filas = await transaccionEnCurso()
      .select({ codigo: mayusculas })
      .from(activos)
      .where(
        inArray(
          mayusculas,
          codigos.map((codigo) => codigo.toUpperCase()),
        ),
      );
    return new Set(filas.map((fila) => fila.codigo));
  }

  async tieneComponentes(id: ActivoId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(eq(activos.activoPadreId, id.valor))
      .limit(1);
    return fila !== undefined;
  }

  async tieneMovimientos(id: ActivoId): Promise<boolean> {
    const hay = (tabla: PgTable, donde: SQL | undefined) =>
      transaccionEnCurso()
        .select({ uno: sql`1` })
        .from(tabla)
        .where(donde)
        .limit(1);
    const consultas = [
      hay(traslados, and(eq(traslados.activoId, id.valor), ne(traslados.esAlta, true))),
      hay(
        costos,
        and(eq(costos.activoId, id.valor), eq(costos.estado, 'vigente'), isNotNull(costos.lineaDeDocumentoId)),
      ),
      hay(cuotas, eq(cuotas.activoId, id.valor)),
      hay(mejoras, eq(mejoras.activoId, id.valor)),
      hay(bajas, eq(bajas.activoId, id.valor)),
    ];
    for (const consulta of consultas) if ((await consulta).length > 0) return true;
    return this.tieneDivisiones(id);
  }

  async tieneDivisiones(id: ActivoId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: divisiones.id })
      .from(divisiones)
      .where(or(eq(divisiones.activoOrigenId, id.valor), eq(divisiones.activoNuevoId, id.valor)))
      .limit(1);
    return fila !== undefined;
  }
}

/** La fila de alta del historial de traslados: la ubicación con la que nace el activo. */
function filaDeAlta(activo: Activo): typeof traslados.$inferInsert {
  const { id, empresaId, fechaDeAdquisicion, localidadId, departamentoId, responsable, enBodega } =
    activo.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    esAlta: true,
    fecha: fechaDeAdquisicion,
    localidadId,
    departamentoId,
    responsable,
    aBodega: enBodega,
  };
}
