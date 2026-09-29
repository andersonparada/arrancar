import { and, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ChequeDto, ChequeListadoDto, FiltroDeChequesDeLaEmpresa } from '../../aplicacion/dto/cheque.dto.js';
import type { ConsultasCheques } from '../../aplicacion/puertos/consultas-cheques.js';
import { accionesDeCheque } from '../../aplicacion/acciones-posibles.js';
import { hechosDelMovimientoDelCheque, mapeadorDeCheque } from './cheque.mapeador.js';
import { cheques } from './cheques.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { columnasDeHechos } from './hechos-de-movimiento.js';
import { movimientos } from './movimientos.tablas.js';

const columnas = { ...getTableColumns(cheques), hechosDelMovimiento: columnasDeHechos(movimientos) };

/** El cheque con lo necesario de su movimiento (si lo tiene) para saber qué se puede hacer con él. */
const consultaBase = () =>
  transaccionEnCurso().select(columnas).from(cheques).leftJoin(movimientos, eq(movimientos.id, cheques.movimientoId));

/** La fecha con que se filtra y se ordena: la del movimiento, o si nunca se emitió, la de su anulación. */
const fechaEfectiva = sql<string>`coalesce(${movimientos.fecha}, (${cheques.anuladoEn})::date)`;

const condicionesDeLaEmpresa = ({ cuentaBancariaId, estado, desde, hasta }: FiltroDeChequesDeLaEmpresa) =>
  and(
    sql`${cheques.estado} in ('emitido', 'anulado')`,
    cuentaBancariaId ? eq(chequeras.cuentaBancariaId, cuentaBancariaId) : undefined,
    estado ? eq(cheques.estado, estado) : undefined,
    desde ? sql`${fechaEfectiva} >= ${desde}` : undefined,
    hasta ? sql`${fechaEfectiva} <= ${hasta}` : undefined,
  );

const columnasDeLaEmpresa = {
  id: cheques.id,
  numero: cheques.numero,
  serie: chequeras.serie,
  cuentaBancariaId: chequeras.cuentaBancariaId,
  cuentaBancariaNombre: cuentasBancarias.nombre,
  estado: cheques.estado,
  noNegociable: cheques.noNegociable,
  fecha: fechaEfectiva,
  monto: movimientos.monto,
  beneficiario: movimientos.beneficiario,
  referencia: movimientos.referencia,
  anuladoEn: cheques.anuladoEn,
  motivoDeAnulacion: cheques.motivoDeAnulacion,
  movimientoId: cheques.movimientoId,
  hechosDelMovimiento: columnasDeHechos(movimientos),
};

const consultaDelListado = () =>
  transaccionEnCurso()
    .select(columnasDeLaEmpresa)
    .from(cheques)
    .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
    .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, chequeras.cuentaBancariaId))
    .leftJoin(movimientos, eq(movimientos.id, cheques.movimientoId));

type FilaDelListado = Awaited<ReturnType<typeof consultaDelListado>>[number];

const aListado = ({ movimientoId, hechosDelMovimiento, ...fila }: FilaDelListado): ChequeListadoDto => {
  const estado = fila.estado as ChequeListadoDto['estado'];
  return {
    ...fila,
    estado,
    anuladoEn: fila.anuladoEn ? fila.anuladoEn.toISOString() : null,
    ...accionesDeCheque(estado, hechosDelMovimientoDelCheque(movimientoId, hechosDelMovimiento)),
  };
};

export class ConsultasChequesDrizzle implements ConsultasCheques {
  async listarDeLaChequera(chequeraId: string, estado?: 'disponible' | 'emitido' | 'anulado'): Promise<ChequeDto[]> {
    const filas = await consultaBase()
      .where(and(eq(cheques.chequeraId, chequeraId), estado ? eq(cheques.estado, estado) : undefined))
      .orderBy(asc(cheques.numero));
    return filas.map(mapeadorDeCheque.aDto);
  }

  /** Los cheques emitidos o anulados de la empresa, más recientes primero; los disponibles no se listan aquí. */
  async listarDeLaEmpresa(filtro: FiltroDeChequesDeLaEmpresa): Promise<ChequeListadoDto[]> {
    const filas = await consultaDelListado()
      .where(condicionesDeLaEmpresa(filtro))
      .orderBy(desc(fechaEfectiva), desc(cheques.creadoEn));
    return filas.map(aListado);
  }

  async obtener(chequeId: string): Promise<ChequeDto> {
    const [fila] = await consultaBase().where(eq(cheques.id, chequeId));
    if (!fila) throw new RecursoNoEncontrado('El cheque');
    return mapeadorDeCheque.aDto(fila);
  }

  /** El menor disponible por serie y número entre las chequeras activas de la cuenta. */
  async siguienteDisponible(cuentaBancariaId: string): Promise<ChequeDto | null> {
    const [fila] = await consultaBase()
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .where(
        and(
          eq(chequeras.cuentaBancariaId, cuentaBancariaId),
          eq(chequeras.activa, true),
          eq(cheques.estado, 'disponible'),
        ),
      )
      .orderBy(asc(chequeras.serie), asc(cheques.numero))
      .limit(1);
    return fila ? mapeadorDeCheque.aDto(fila) : null;
  }
}
