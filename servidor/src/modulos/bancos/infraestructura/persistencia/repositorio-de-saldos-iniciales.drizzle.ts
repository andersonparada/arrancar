import { eq } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  CabeceraDeSaldoInicial,
  DatosDeCabecera,
  RepositorioDeSaldosIniciales,
} from '../../aplicacion/puertos/repositorio-de-saldos-iniciales.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

type Fila = typeof saldosIniciales.$inferSelect;

const aCabecera = ({
  id,
  cuentaBancariaId,
  saldoSegunLibrosAnteriores,
  observaciones,
  evidenciaArchivoId,
}: Fila): CabeceraDeSaldoInicial => ({
  id,
  cuentaBancariaId,
  saldoSegunLibrosAnteriores,
  observaciones,
  evidenciaArchivoId,
});

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeSaldosInicialesDrizzle implements RepositorioDeSaldosIniciales {
  async bloquearCuenta(cuentaBancariaId: string): Promise<{ activa: boolean }> {
    const [cuenta] = await transaccionEnCurso()
      .select({ activa: cuentasBancarias.activo })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.id, cuentaBancariaId))
      .for('update');
    if (!cuenta) throw new RecursoNoEncontrado('La cuenta bancaria');
    return cuenta;
  }

  async buscarDeLaCuenta(cuentaBancariaId: string): Promise<CabeceraDeSaldoInicial | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(saldosIniciales)
      .where(eq(saldosIniciales.cuentaBancariaId, cuentaBancariaId))
      .for('update');
    return fila ? aCabecera(fila) : null;
  }

  async agregar(
    empresaId: string,
    cuentaBancariaId: string,
    { saldoSegunLibrosAnteriores, observaciones }: DatosDeCabecera,
  ): Promise<CabeceraDeSaldoInicial> {
    const [fila] = await transaccionEnCurso()
      .insert(saldosIniciales)
      .values({ empresaId, cuentaBancariaId, saldoSegunLibrosAnteriores, observaciones })
      .returning();
    return aCabecera(fila!);
  }

  async guardar({ id, saldoSegunLibrosAnteriores, observaciones }: CabeceraDeSaldoInicial): Promise<void> {
    await transaccionEnCurso()
      .update(saldosIniciales)
      .set({ saldoSegunLibrosAnteriores, observaciones })
      .where(eq(saldosIniciales.id, id));
  }

  async ponerEvidencia(id: string, archivoId: string | null): Promise<void> {
    await transaccionEnCurso()
      .update(saldosIniciales)
      .set({ evidenciaArchivoId: archivoId })
      .where(eq(saldosIniciales.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(saldosIniciales).where(eq(saldosIniciales.id, id));
  }
}
