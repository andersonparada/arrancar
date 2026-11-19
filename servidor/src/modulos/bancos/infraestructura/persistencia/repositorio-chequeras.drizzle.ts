import { and, between, asc, desc, eq, or, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioChequeras } from '../../aplicacion/puertos/repositorio-chequeras.js';
import type { Chequera, ChequeraId, FormatoDeLaChequera } from '../../dominio/chequera.js';
import { chequeras } from './chequeras.tablas.js';
import { cheques } from './cheques.tablas.js';
import { formatosDeCheque } from './formatos-de-cheque.tablas.js';
import { mapeadorDeChequera } from './chequera.mapeador.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioChequerasDrizzle implements RepositorioChequeras {
  async buscar(id: ChequeraId): Promise<Chequera | null> {
    const [fila] = await transaccionEnCurso().select().from(chequeras).where(eq(chequeras.id, id.valor));
    return fila ? mapeadorDeChequera.aEntidad(fila) : null;
  }

  async agregar(chequera: Chequera): Promise<void> {
    await transaccionEnCurso().insert(chequeras).values(mapeadorDeChequera.aFila(chequera));
  }

  async guardar(chequera: Chequera): Promise<void> {
    await transaccionEnCurso()
      .update(chequeras)
      .set(mapeadorDeChequera.aFila(chequera))
      .where(eq(chequeras.id, chequera.id.valor));
  }

  /** Las chequeras de apertura no cuentan aquí: su rango es solo el menor y el mayor de sus cheques, con huecos. */
  async rangosDeLaCuenta(cuentaBancariaId: string) {
    return transaccionEnCurso()
      .select({ serie: chequeras.serie, desde: chequeras.desde, hasta: chequeras.hasta })
      .from(chequeras)
      .where(and(eq(chequeras.cuentaBancariaId, cuentaBancariaId), eq(chequeras.deApertura, false)));
  }

  /** La plantilla de fábrica, o el formato guardado si sigue activo, de la chequera más reciente que tenga uno. */
  async ultimoFormatoDeLaCuenta(cuentaBancariaId: string): Promise<FormatoDeLaChequera | null> {
    const [fila] = await transaccionEnCurso()
      .select({ formatoDeChequeId: chequeras.formatoDeChequeId, plantillaDeCheque: chequeras.plantillaDeCheque })
      .from(chequeras)
      .leftJoin(formatosDeCheque, eq(formatosDeCheque.id, chequeras.formatoDeChequeId))
      .where(
        and(
          eq(chequeras.cuentaBancariaId, cuentaBancariaId),
          eq(chequeras.deApertura, false),
          or(sql`${chequeras.plantillaDeCheque} is not null`, eq(formatosDeCheque.activo, true)),
        ),
      )
      .orderBy(desc(chequeras.creadoEn))
      .limit(1);
    return fila ?? null;
  }

  async numerosDeAperturaEnRango(
    cuentaBancariaId: string,
    rango: { serie: string | null; desde: number; hasta: number },
  ): Promise<number[]> {
    const filas = await transaccionEnCurso()
      .select({ numero: cheques.numero })
      .from(cheques)
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .where(
        and(
          eq(chequeras.cuentaBancariaId, cuentaBancariaId),
          eq(chequeras.deApertura, true),
          sql`coalesce(${chequeras.serie}, '') = ${rango.serie ?? ''}`,
          between(cheques.numero, rango.desde, rango.hasta),
        ),
      )
      .orderBy(asc(cheques.numero));
    return filas.map((fila) => fila.numero);
  }
}
