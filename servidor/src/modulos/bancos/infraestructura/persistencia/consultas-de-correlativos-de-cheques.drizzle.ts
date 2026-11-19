import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { auditoria } from '../../../core/compartido/infraestructura/persistencia/auditoria.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ChequeDelCorrelativo,
  ConsultasDeCorrelativosDeCheques,
} from '../../aplicacion/puertos/consultas-de-correlativos-de-cheques.js';
import { aCentavos } from '../../dominio/centavos.js';
import { bancos } from './bancos.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { cheques } from './cheques.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const ETIQUETA_DE_APERTURA = 'De la carga inicial';
const numeroNuevo = sql<string | null>`${auditoria.anterior}->'pasoAOtroFormulario'->>'numeroNuevo'`;

/** Los cheques de una chequera con su movimiento, y a dónde pasó el pago de los inutilizados (de la auditoría). */
export class ConsultasDeCorrelativosDeChequesDrizzle implements ConsultasDeCorrelativosDeCheques {
  async chequera(chequeraId: string) {
    const [fila] = await transaccionEnCurso()
      .select({
        chequera: chequeras,
        cuentaId: cuentasBancarias.id,
        cuentaNombre: cuentasBancarias.nombre,
        cuentaNumero: cuentasBancarias.numero,
        banco: bancos.nombre,
      })
      .from(chequeras)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, chequeras.cuentaBancariaId))
      .innerJoin(bancos, eq(bancos.id, cuentasBancarias.bancoId))
      .where(eq(chequeras.id, chequeraId));
    if (!fila) return null;
    const { id, serie, desde, hasta, activa, deApertura } = fila.chequera;
    return {
      chequera: { id, serie, desde, hasta, activa, deApertura, etiqueta: deApertura ? ETIQUETA_DE_APERTURA : null },
      cuenta: { id: fila.cuentaId, nombre: fila.cuentaNombre, numero: fila.cuentaNumero, banco: fila.banco },
    };
  }

  async cheques(chequeraId: string): Promise<ChequeDelCorrelativo[]> {
    const filas = await transaccionEnCurso()
      .select({
        id: cheques.id,
        numero: cheques.numero,
        estado: cheques.estado,
        causa: cheques.causaDeAnulacion,
        impresoEn: cheques.impresoEn,
        motivoDeAnulacion: cheques.motivoDeAnulacion,
        movimientoId: movimientos.id,
        fecha: movimientos.fecha,
        beneficiario: movimientos.beneficiario,
        monto: movimientos.monto,
      })
      .from(cheques)
      .leftJoin(movimientos, eq(movimientos.id, cheques.movimientoId))
      .where(eq(cheques.chequeraId, chequeraId))
      .orderBy(asc(cheques.numero));
    return filas.map(({ movimientoId, fecha, beneficiario, monto, ...cheque }) => ({
      ...cheque,
      movimiento: movimientoId ? { fecha: fecha!, beneficiario, montoCentavos: aCentavos(monto!) } : null,
    }));
  }

  async adondePasaron(chequeIds: readonly string[]): Promise<Map<string, number>> {
    if (chequeIds.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({ chequeId: auditoria.registroId, numero: numeroNuevo })
      .from(auditoria)
      .where(
        and(
          eq(auditoria.recurso, 'bancos.cheques'),
          eq(auditoria.accion, 'inutilizar'),
          inArray(auditoria.registroId, [...chequeIds]),
        ),
      )
      .orderBy(asc(auditoria.creadoEn));
    return new Map(filas.flatMap(({ chequeId, numero }) => (numero === null ? [] : [[chequeId, Number(numero)]])));
  }
}
