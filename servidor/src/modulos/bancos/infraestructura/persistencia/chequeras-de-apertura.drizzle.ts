import { and, eq, max, min, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ChequerasDeApertura, ChequeUbicado } from '../../aplicacion/puertos/chequeras-de-apertura.js';
import { Chequera } from '../../dominio/chequera.js';
import { mapeadorDeCheque } from './cheque.mapeador.js';
import { mapeadorDeChequera } from './chequera.mapeador.js';
import { cheques } from './cheques.tablas.js';
import { chequeras } from './chequeras.tablas.js';

/** Las chequeras de la cuenta con esa serie (la serie vacía y la nula son la misma). */
const delaSerie = (cuentaBancariaId: string, serie: string | null) =>
  and(eq(chequeras.cuentaBancariaId, cuentaBancariaId), sql`coalesce(${chequeras.serie}, '') = ${serie ?? ''}`);

type FilasUbicadas = { cheque: typeof cheques.$inferSelect; chequera: typeof chequeras.$inferSelect };

const aUbicado = ({ cheque, chequera }: FilasUbicadas): ChequeUbicado => ({
  cheque: mapeadorDeCheque.aEntidad(cheque),
  chequera: mapeadorDeChequera.aEntidad(chequera),
});

/** La chequera de apertura (docs/modulos/diseno-bancos-segunda-parte.md §2.3); la seguridad por empresa (RLS) limita lo que se ve. */
export class ChequerasDeAperturaDrizzle implements ChequerasDeApertura {
  async ubicar(cuentaBancariaId: string, serie: string | null, numero: number): Promise<ChequeUbicado | null> {
    const [fila] = await transaccionEnCurso()
      .select({ cheque: cheques, chequera: chequeras })
      .from(cheques)
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .where(and(delaSerie(cuentaBancariaId, serie), eq(cheques.numero, numero)))
      .limit(1);
    return fila ? aUbicado(fila) : null;
  }

  async ubicarPorMovimiento(movimientoId: string): Promise<ChequeUbicado | null> {
    const [fila] = await transaccionEnCurso()
      .select({ cheque: cheques, chequera: chequeras })
      .from(cheques)
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .where(eq(cheques.movimientoId, movimientoId));
    return fila ? aUbicado(fila) : null;
  }

  async deLaSerie(
    empresaId: string,
    datos: { cuentaBancariaId: string; serie: string | null; numero: number },
  ): Promise<Chequera> {
    const tx = transaccionEnCurso();
    const [existente] = await tx
      .select()
      .from(chequeras)
      .where(and(delaSerie(datos.cuentaBancariaId, datos.serie), eq(chequeras.deApertura, true)))
      .for('update');
    if (existente) return mapeadorDeChequera.aEntidad(existente);
    const nueva = Chequera.deApertura(Identificador.desde(empresaId), datos);
    await tx.insert(chequeras).values(mapeadorDeChequera.aFila(nueva));
    return nueva;
  }

  async quitarCheque(chequeId: string): Promise<void> {
    await transaccionEnCurso().delete(cheques).where(eq(cheques.id, chequeId));
  }

  async ajustarRango(chequeraId: string): Promise<void> {
    const tx = transaccionEnCurso();
    const [rango] = await tx
      .select({ desde: min(cheques.numero), hasta: max(cheques.numero) })
      .from(cheques)
      .where(eq(cheques.chequeraId, chequeraId));
    if (!rango || rango.desde === null || rango.hasta === null) {
      await tx.delete(chequeras).where(and(eq(chequeras.id, chequeraId), eq(chequeras.deApertura, true)));
      return;
    }
    await tx.update(chequeras).set({ desde: rango.desde, hasta: rango.hasta }).where(eq(chequeras.id, chequeraId));
  }
}
