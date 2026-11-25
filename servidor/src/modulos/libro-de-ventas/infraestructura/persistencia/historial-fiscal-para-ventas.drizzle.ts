import { and, eq, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import type { HistorialFiscalParaVentas } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { RegimenDeIsr, RegimenDeIva, RegimenDelMes } from '../../dominio/regimen-de-la-empresa.js';

/**
 * El historial fiscal de la empresa vive en Libro de compras (del que este módulo depende) y aquí solo se lee: la
 * vigencia que rige en el mes es la última que empezó hasta ese mes (la base, con `vigente_desde` nulo, rige desde el
 * inicio). Para una factura del sistema anterior solo cuenta una vigencia con fecha (`regimenConVigenciaEn`). Con `bloquear` toma esas filas con `for share`: quien cambia el historial (`for update`) espera a que
 * termine el registro, o el registro espera al cambio.
 */
export class HistorialFiscalParaVentasDrizzle implements HistorialFiscalParaVentas {
  async regimenEn(empresaId: string, periodo: string, bloquear: boolean): Promise<RegimenDelMes | null> {
    const transaccion = transaccionEnCurso();
    if (bloquear) {
      await transaccion
        .select({ id: datosFiscalesDeEmpresa.id })
        .from(datosFiscalesDeEmpresa)
        .where(eq(datosFiscalesDeEmpresa.empresaId, empresaId))
        .for('share');
    }
    return this.vigenciaDelMes(
      and(
        eq(datosFiscalesDeEmpresa.empresaId, empresaId),
        or(isNull(datosFiscalesDeEmpresa.vigenteDesde), lte(datosFiscalesDeEmpresa.vigenteDesde, periodo)),
      ),
    );
  }

  async regimenConVigenciaEn(empresaId: string, periodo: string): Promise<RegimenDelMes | null> {
    return this.vigenciaDelMes(
      and(eq(datosFiscalesDeEmpresa.empresaId, empresaId), lte(datosFiscalesDeEmpresa.vigenteDesde, periodo)),
    );
  }

  private async vigenciaDelMes(condicion: SQL | undefined): Promise<RegimenDelMes | null> {
    const [fila] = await transaccionEnCurso()
      .select({ regimenIva: datosFiscalesDeEmpresa.regimenIva, regimenIsr: datosFiscalesDeEmpresa.regimenIsr })
      .from(datosFiscalesDeEmpresa)
      .where(condicion)
      .orderBy(sql`${datosFiscalesDeEmpresa.vigenteDesde} desc nulls last`)
      .limit(1);
    if (!fila) return null;
    return { regimenIva: fila.regimenIva as RegimenDeIva, regimenIsr: fila.regimenIsr as RegimenDeIsr | null };
  }
}
