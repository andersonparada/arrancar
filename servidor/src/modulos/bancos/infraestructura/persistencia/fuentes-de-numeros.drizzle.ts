import { and, count, eq, isNotNull, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import {
  CLAVE_DE_NOTAS_DE_CREDITO,
  CLAVE_DE_NOTAS_DE_DEBITO,
  CLAVE_DE_TRANSFERENCIAS,
} from '../../aplicacion/numeracion-de-comprobantes.js';
import { movimientos } from './movimientos.tablas.js';
import { transferencias } from './transferencias.tablas.js';

/** De dónde salen los números de un correlativo: su tabla, y qué dice la auditoría de cada uno. */
export interface FuenteDeNumeros {
  /** El `recurso` con que la auditoría registra las bajas de estos comprobantes. */
  recursoAuditado: string;
  /** El `tipo` del comprobante en su tabla y en la auditoría; `null` si no hay tipos (transferencias). */
  tipo: 'credito' | 'debito' | null;
  emitidos(anio: number): Promise<number>;
  /** Los números de 1 a `ultimo` que ya no están en la tabla. */
  huecos(anio: number, ultimo: number): Promise<number[]>;
}

/** Los números de 1 a `ultimo` para los que `existe` (una subconsulta sobre `g.n`) no encuentra nada. */
async function numerosFaltantes(ultimo: number, existe: SQL): Promise<number[]> {
  const { rows } = await transaccionEnCurso().execute<{ n: number }>(
    sql`select g.n::int as n from generate_series(1, ${ultimo}::int) as g(n) where not exists (${existe}) order by g.n`,
  );
  return rows.map(({ n }) => n);
}

function fuenteDeNotas(tipo: 'credito' | 'debito'): FuenteDeNumeros {
  const delTipo = (anio: number) =>
    and(eq(movimientos.tipo, tipo), eq(movimientos.anioDeNumero, anio), isNotNull(movimientos.numero));
  return {
    recursoAuditado: 'bancos.movimientos',
    tipo,
    async emitidos(anio) {
      const [fila] = await transaccionEnCurso().select({ total: count() }).from(movimientos).where(delTipo(anio));
      return fila?.total ?? 0;
    },
    huecos: (anio, ultimo) =>
      numerosFaltantes(
        ultimo,
        sql`select 1 from ${movimientos} where ${delTipo(anio)} and ${movimientos.numero} = g.n`,
      ),
  };
}

const deLaTransferencia = (anio: number) =>
  and(eq(transferencias.anioDeNumero, anio), isNotNull(transferencias.numero));

const fuenteDeTransferencias: FuenteDeNumeros = {
  recursoAuditado: 'bancos.transferencias',
  tipo: null,
  async emitidos(anio) {
    const [fila] = await transaccionEnCurso()
      .select({ total: count() })
      .from(transferencias)
      .where(deLaTransferencia(anio));
    return fila?.total ?? 0;
  },
  huecos: (anio, ultimo) =>
    numerosFaltantes(
      ultimo,
      sql`select 1 from ${transferencias} where ${deLaTransferencia(anio)} and ${transferencias.numero} = g.n`,
    ),
};

/** Las fuentes de los correlativos de Bancos, por su clave en `core.correlativos`. */
export const FUENTES_DE_NUMEROS: Record<string, FuenteDeNumeros> = {
  [CLAVE_DE_NOTAS_DE_CREDITO]: fuenteDeNotas('credito'),
  [CLAVE_DE_NOTAS_DE_DEBITO]: fuenteDeNotas('debito'),
  [CLAVE_DE_TRANSFERENCIAS]: fuenteDeTransferencias,
};
