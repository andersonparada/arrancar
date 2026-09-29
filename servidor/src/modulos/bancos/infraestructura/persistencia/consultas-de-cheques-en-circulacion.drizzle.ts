import { and, asc, eq, ilike, inArray, isNull, lt } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ChequeEnCirculacionCrudo,
  CondicionesDeCirculacion,
  ConsultasDeChequesEnCirculacion,
} from '../../aplicacion/puertos/consultas-de-cheques-en-circulacion.js';
import { cheques } from './cheques.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { mesConciliadoDe } from './hechos-de-movimiento.js';
import { movimientos } from './movimientos.tablas.js';

/** Escapa los comodines de LIKE para que el texto del usuario se busque tal cual. */
const comoTextoLiteral = (texto: string): string => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

/**
 * Las condiciones del índice parcial `movimientos_cheques_en_circulacion_idx` (cheque sin cobrar, sin
 * revertir y sin anular), más el cheque en estado emitido y el corte de fecha y los filtros.
 */
const condicionesDeCirculacion = ({
  fechaDeCorte,
  cuentaBancariaId,
  beneficiario,
  chequeIds,
}: CondicionesDeCirculacion) =>
  and(
    eq(cheques.estado, 'emitido'),
    eq(movimientos.tipo, 'cheque'),
    isNull(movimientos.conciliacionId),
    isNull(movimientos.revertidoEn),
    isNull(movimientos.anuladoEn),
    lt(movimientos.fecha, fechaDeCorte),
    cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
    chequeIds ? inArray(cheques.id, chequeIds) : undefined,
    beneficiario ? ilike(movimientos.beneficiario, `%${comoTextoLiteral(beneficiario)}%`) : undefined,
  );

/** Los cheques emitidos y sin cobrar de la empresa que ya pasaron la fecha de corte. */
export class ConsultasDeChequesEnCirculacionDrizzle implements ConsultasDeChequesEnCirculacion {
  async listar(condiciones: CondicionesDeCirculacion): Promise<ChequeEnCirculacionCrudo[]> {
    return transaccionEnCurso()
      .select({
        chequeId: cheques.id,
        movimientoId: movimientos.id,
        cuentaBancariaId: movimientos.cuentaBancariaId,
        cuentaBancariaNombre: cuentasBancarias.nombre,
        serie: chequeras.serie,
        numero: cheques.numero,
        fecha: movimientos.fecha,
        beneficiario: movimientos.beneficiario,
        monto: movimientos.monto,
        mesConciliado: mesConciliadoDe(movimientos.cuentaBancariaId, movimientos.fecha),
      })
      .from(cheques)
      .innerJoin(movimientos, eq(movimientos.id, cheques.movimientoId))
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, movimientos.cuentaBancariaId))
      .where(condicionesDeCirculacion(condiciones))
      .orderBy(asc(movimientos.fecha), asc(cuentasBancarias.nombre), asc(cheques.numero));
  }
}
