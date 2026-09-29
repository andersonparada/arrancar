import { and, asc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeSugerencias,
  FiltroDeSugerencias,
  PendienteDeClasificar,
  RangoDeFechas,
} from '../../aplicacion/puertos/consultas-de-sugerencias.js';
import { aCentavos } from '../../dominio/centavos.js';
import { direccionDe } from '../../dominio/sugerencias/tipos.js';
import type { Ejemplo } from '../../dominio/sugerencias/tipos.js';
import { CLAVE_DE_PAGO_A_PROVEEDORES } from '../../dominio/asignacion-de-concepto.js';
import { esPendienteDeClasificar } from './condiciones-de-clasificacion.js';
import { conceptos } from './conceptos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/** Tope de ejemplos que se traen de una vez: más de esto no cambia el resultado (solo pesan los más cercanos). */
const MAXIMO_DE_EJEMPLOS = 50_000;

/** La misma normalización que del beneficiario, aplicada a la referencia y las observaciones juntas. */
const textoParaComparar = sql<
  string | null
>`bancos.nombre_para_comparar(concat_ws(' ', ${movimientos.referencia}, ${movimientos.observaciones}))`;

const columnasParaComparar = {
  id: movimientos.id,
  tipo: movimientos.tipo,
  fecha: movimientos.fecha,
  monto: movimientos.monto,
  cuentaBancariaId: movimientos.cuentaBancariaId,
  beneficiarioParaComparar: movimientos.beneficiarioParaComparar,
  textoParaComparar,
};

interface Fila {
  id: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  cuentaBancariaId: string;
  beneficiarioParaComparar: string | null;
  textoParaComparar: string | null;
}

const datosParaComparar = (fila: Fila) => ({
  fecha: fila.fecha,
  montoEnCentavos: aCentavos(fila.monto),
  direccion: direccionDe(fila.tipo),
  cuentaBancariaId: fila.cuentaBancariaId,
  beneficiarioParaComparar: fila.beneficiarioParaComparar,
  textoParaComparar: fila.textoParaComparar,
});

/**
 * Un ejemplo: original de Bancos que una persona clasificó (sin origen en otro módulo, sin transferencia, sin saldo
 * inicial); su concepto no es de sistema, salvo «Pago a proveedores» en un cheque (P3). Cuentan también los anulados
 * y los revertidos: el concepto lo eligió una persona y sigue siendo dato.
 */
const esEjemplo = and(
  isNull(movimientos.revierteAId),
  isNull(movimientos.transferenciaId),
  eq(movimientos.saldoInicial, false),
  isNull(movimientos.moduloDeOrigen),
  or(
    isNull(conceptos.claveDeSistema),
    and(eq(conceptos.claveDeSistema, CLAVE_DE_PAGO_A_PROVEEDORES), eq(movimientos.tipo, 'cheque')),
  ),
);

const enElRango = ({ desde, hasta }: RangoDeFechas) =>
  and(gte(movimientos.fecha, desde), lte(movimientos.fecha, hasta));

/** Lecturas de las sugerencias de concepto (P7): con las tablas vivas, sin caché. */
export class ConsultasDeSugerenciasDrizzle implements ConsultasDeSugerencias {
  async pendientes(filtro: FiltroDeSugerencias, limite: number): Promise<PendienteDeClasificar[]> {
    const { cuentaBancariaId, desde, hasta } = filtro;
    const filas = await transaccionEnCurso()
      .select(columnasParaComparar)
      .from(movimientos)
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .where(
        and(
          esPendienteDeClasificar,
          cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
          desde ? gte(movimientos.fecha, desde) : undefined,
          hasta ? lte(movimientos.fecha, hasta) : undefined,
        ),
      )
      .orderBy(asc(movimientos.fecha), asc(movimientos.creadoEn))
      .limit(limite);
    return filas.map((fila) => ({ ...datosParaComparar(fila), id: fila.id, tipo: fila.tipo }));
  }

  ejemplosPorBeneficiario(claves: string[], rango: RangoDeFechas): Promise<Ejemplo[]> {
    return this.ejemplos(and(inArray(movimientos.beneficiarioParaComparar, claves), enElRango(rango)));
  }

  ejemplosSinBeneficiario(cuentasBancarias: string[], rango: RangoDeFechas): Promise<Ejemplo[]> {
    return this.ejemplos(
      and(
        isNull(movimientos.beneficiarioParaComparar),
        inArray(movimientos.cuentaBancariaId, cuentasBancarias),
        enElRango(rango),
      ),
    );
  }

  async nombreParaComparar(texto: string | null): Promise<string | null> {
    const resultado = await transaccionEnCurso().execute<{ valor: string | null }>(
      sql`select bancos.nombre_para_comparar(${texto}::text) as valor`,
    );
    return resultado.rows[0]?.valor ?? null;
  }

  private async ejemplos(condicion: SQL | undefined): Promise<Ejemplo[]> {
    const filas = await transaccionEnCurso()
      .select({ ...columnasParaComparar, conceptoId: movimientos.conceptoId })
      .from(movimientos)
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .where(and(esEjemplo, condicion))
      .orderBy(asc(movimientos.fecha))
      .limit(MAXIMO_DE_EJEMPLOS);
    return filas.map((fila) => ({ ...datosParaComparar(fila), id: fila.id, conceptoId: fila.conceptoId }));
  }
}
