import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import type { MetodoGuardado, RepositorioDeMetodos } from '../../aplicacion/puertos/repositorio-de-metodos.js';
import { metodosDeCosteo } from './metodos-de-costeo.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeMetodosDrizzle implements RepositorioDeMetodos {
  async listar(): Promise<MetodoGuardado[]> {
    const filas = await transaccionEnCurso().select().from(metodosDeCosteo).orderBy(desc(metodosDeCosteo.desde));
    return filas.map(({ id, metodo, desde, fijadoEn, autorizacionSatNumero, autorizacionSatFecha, motivo }) => ({
      id,
      metodo,
      desde,
      fijadoEn,
      autorizacionSatNumero,
      autorizacionSatFecha,
      motivo,
    }));
  }

  async agregar(metodo: MetodoGuardado): Promise<void> {
    await transaccionEnCurso()
      .insert(metodosDeCosteo)
      .values({ ...metodo, empresaId: deLaTransaccion.empresa() });
  }

  async fijar(id: string, ahora: Date): Promise<void> {
    await transaccionEnCurso().update(metodosDeCosteo).set({ fijadoEn: ahora }).where(eq(metodosDeCosteo.id, id));
  }

  async cambiar(id: string, metodo: MetodoDeCosteo): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .update(metodosDeCosteo)
      .set({ metodo })
      .where(and(eq(metodosDeCosteo.id, id), isNull(metodosDeCosteo.fijadoEn)))
      .returning({ id: metodosDeCosteo.id });
    return filas.length > 0;
  }

  async bloquearPolitica(): Promise<void> {
    await transaccionEnCurso().execute(
      sql`select pg_advisory_xact_lock(hashtextextended('inventarios.metodo:' || current_setting('app.empresa_id', true), 0))`,
    );
  }
}
