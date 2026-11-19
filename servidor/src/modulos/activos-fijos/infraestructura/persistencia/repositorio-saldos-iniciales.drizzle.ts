import { and, eq } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  RegistroDeSaldoInicial,
  RepositorioSaldosIniciales,
} from '../../aplicacion/puertos/repositorio-saldos-iniciales.js';
import { periodoDe } from '../../dominio/depreciacion/meses.js';
import { fechaDeCorteDe } from '../../dominio/saldos-iniciales/saldo-inicial.js';
import { costos } from './costos.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';
import { tramos } from './tramos.tablas.js';

function aFila({ empresaId, activoId, fechaDeCorte, datos }: RegistroDeSaldoInicial) {
  return {
    empresaId,
    activoId,
    fechaDeCorte,
    costo: deCentavos(datos.costoCentavos),
    depreciacionAcumuladaContable: deCentavos(datos.acumuladaContableCentavos),
    costoFiscal: deCentavos(datos.costoFiscalCentavos),
    baseFiscal: deCentavos(datos.baseFiscalCentavos),
    depreciacionAcumuladaFiscal: deCentavos(datos.acumuladaFiscalCentavos),
    vidaUtilRestanteMeses: datos.vidaUtilRestanteMeses,
  };
}

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioSaldosInicialesDrizzle implements RepositorioSaldosIniciales {
  async agregar(registro: RegistroDeSaldoInicial): Promise<void> {
    await transaccionEnCurso().insert(saldosIniciales).values(aFila(registro));
  }

  async reemplazar(registro: RegistroDeSaldoInicial): Promise<void> {
    const { empresaId, activoId, ...cambios } = aFila(registro);
    await transaccionEnCurso().update(saldosIniciales).set(cambios).where(eq(saldosIniciales.activoId, activoId));
  }

  async reubicar(fechaDeInicio: string): Promise<void> {
    const transaccion = transaccionEnCurso();
    const fechaDeCorte = fechaDeCorteDe(fechaDeInicio);
    await transaccion.update(saldosIniciales).set({ fechaDeCorte });
    await transaccion
      .update(tramos)
      .set({ desdePeriodo: periodoDe(fechaDeInicio) })
      .where(and(eq(tramos.causa, 'saldo_inicial'), eq(tramos.vigente, true)));
    await transaccion.update(costos).set({ fecha: fechaDeCorte }).where(eq(costos.origen, 'saldo_inicial'));
  }
}
