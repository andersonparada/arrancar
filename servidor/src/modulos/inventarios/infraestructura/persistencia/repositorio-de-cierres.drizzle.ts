import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  CierreNuevo,
  ExistenciaAlCierreGuardada,
  Reapertura,
  RepositorioDeCierres,
} from '../../aplicacion/puertos/repositorio-de-cierres.js';
import type { CierreGuardado } from '../../dominio/cierre/cierre-guardado.js';
import type { TotalesDelCierre } from '../../dominio/cierre/existencias-del-cierre.js';
import { aCentavosEnteros } from '../../dominio/decimales.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { mapeadorDeCierre } from './cierre.mapeador.js';
import { cierres } from './cierres.tablas.js';
import { enTandas } from './en-tandas.js';
import { existenciasAlCierre } from './existencias-al-cierre.tablas.js';

/** La clave lleva la empresa de la transacción: cada empresa tiene su propio candado (el mismo que toman los documentos). */
export const CLAVE_DEL_CANDADO_DEL_CIERRE = sql`hashtextextended('inventarios.cierre:' || current_setting('app.empresa_id', true), 0)`;

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeCierresDrizzle implements RepositorioDeCierres {
  async bloquear(): Promise<void> {
    await transaccionEnCurso().execute(sql`select pg_advisory_xact_lock(${CLAVE_DEL_CANDADO_DEL_CIERRE})`);
  }

  async ultimoMesCerrado(): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ periodo: cierres.periodo })
      .from(cierres)
      .where(eq(cierres.estado, 'cerrado'))
      .orderBy(desc(cierres.periodo))
      .limit(1);
    return fila?.periodo ?? null;
  }

  async buscar(periodo: string): Promise<CierreGuardado | null> {
    const [fila] = await transaccionEnCurso().select().from(cierres).where(eq(cierres.periodo, periodo));
    return fila ? mapeadorDeCierre.aCierre(fila) : null;
  }

  async listar(): Promise<CierreGuardado[]> {
    const filas = await transaccionEnCurso().select().from(cierres).orderBy(desc(cierres.periodo));
    return filas.map((fila) => mapeadorDeCierre.aCierre(fila));
  }

  async guardar(nuevo: CierreNuevo): Promise<void> {
    const transaccion = transaccionEnCurso();
    const datos = mapeadorDeCierre.aFila(nuevo);
    await transaccion
      .insert(cierres)
      .values({ empresaId: nuevo.empresaId, periodo: nuevo.periodo, ...datos })
      .onConflictDoUpdate({ target: [cierres.empresaId, cierres.periodo], set: datos });
    for (const tanda of enTandas(nuevo.renglones)) {
      await transaccion
        .insert(existenciasAlCierre)
        .values(tanda.map((renglon) => mapeadorDeCierre.aFilaDeRenglon(nuevo.empresaId, nuevo.periodo, renglon)));
    }
  }

  async reabrir({ periodo, usuarioId, ahora, motivo }: Reapertura): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .update(existenciasAlCierre)
      .set({ vigente: false })
      .where(and(eq(existenciasAlCierre.periodo, periodo), eq(existenciasAlCierre.vigente, true)));
    await transaccion
      .update(cierres)
      .set({ estado: 'reabierto', reabiertoEn: ahora, reabiertoPor: usuarioId, motivoDeReapertura: motivo })
      .where(eq(cierres.periodo, periodo));
  }

  /** La foto vigente de las bodegas que el usuario ve (la política de alcance de la tabla recorta el resto). */
  async existencias(periodo: string): Promise<ExistenciaAlCierreGuardada[]> {
    return transaccionEnCurso()
      .select({
        articuloId: articulos.id,
        articuloCodigo: articulos.codigo,
        articuloNombre: articulos.nombre,
        bodegaId: bodegas.id,
        bodegaNombre: bodegas.nombre,
        tipoDeInventario: existenciasAlCierre.tipoDeInventario,
        enTransitoInterno: existenciasAlCierre.enTransitoInterno,
        cantidad: existenciasAlCierre.cantidad,
        costoUnitario: existenciasAlCierre.costoUnitario,
        valor: existenciasAlCierre.valor,
      })
      .from(existenciasAlCierre)
      .innerJoin(articulos, eq(articulos.id, existenciasAlCierre.articuloId))
      .innerJoin(bodegas, eq(bodegas.id, existenciasAlCierre.bodegaId))
      .where(and(eq(existenciasAlCierre.periodo, periodo), eq(existenciasAlCierre.vigente, true)))
      .orderBy(asc(articulos.codigo), asc(bodegas.codigo), asc(existenciasAlCierre.enTransitoInterno));
  }

  async totalesPorTipo(periodo: string): Promise<TotalesDelCierre['porTipo']> {
    const filas = await transaccionEnCurso()
      .select({
        tipoDeInventario: existenciasAlCierre.tipoDeInventario,
        valor: sql<string>`sum(${existenciasAlCierre.valor})`,
      })
      .from(existenciasAlCierre)
      .where(and(eq(existenciasAlCierre.periodo, periodo), eq(existenciasAlCierre.vigente, true)))
      .groupBy(existenciasAlCierre.tipoDeInventario)
      .orderBy(asc(existenciasAlCierre.tipoDeInventario));
    return filas.map(({ tipoDeInventario, valor }) => ({ tipoDeInventario, valor: aCentavosEnteros(valor) }));
  }
}
