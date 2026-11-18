import { and, eq, isNotNull } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import type {
  DatosDelMovimiento,
  FichaDelMovimiento,
  MovimientosDePagos,
} from '../../aplicacion/puertos/puertos-de-pagos.js';

const TIPO_DE_LA_FICHA = { cheque: 'cheque', debito: 'nota_de_debito', credito: 'nota_de_credito' } as const;

/**
 * Lo que Cuentas por pagar lee de los movimientos de Bancos sin orden (el `dependeDe` lo permite, solo lectura): si ya
 * están conciliados, su fecha y su número. Las tablas de Bancos tienen seguridad por empresa (RLS).
 */
export class MovimientosDePagosDrizzle implements MovimientosDePagos {
  async bloquear(movimientoId: string): Promise<void> {
    await transaccionEnCurso()
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId))
      .for('update');
  }

  async estaConciliado(movimientoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(and(eq(movimientos.id, movimientoId), isNotNull(movimientos.conciliacionId)));
    return fila !== undefined;
  }

  async fechaDe(movimientoId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ fecha: movimientos.fecha })
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId));
    return fila?.fecha ?? null;
  }

  async datosDe(movimientoId: string): Promise<DatosDelMovimiento | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        cuentaBancariaId: movimientos.cuentaBancariaId,
        beneficiario: movimientos.beneficiario,
        numeroDeNota: movimientos.numero,
        numeroDeCheque: cheques.numero,
      })
      .from(movimientos)
      .leftJoin(cheques, eq(cheques.movimientoId, movimientos.id))
      .where(eq(movimientos.id, movimientoId));
    if (!fila) return null;
    const { numeroDeNota, numeroDeCheque, ...resto } = fila;
    return { ...resto, numero: numeroDeCheque ?? numeroDeNota ?? 0 };
  }

  async fichaDe(movimientoId: string): Promise<FichaDelMovimiento | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        cuentaBancariaId: movimientos.cuentaBancariaId,
        cuentaBancariaNombre: cuentasBancarias.nombre,
        tipo: movimientos.tipo,
        fecha: movimientos.fecha,
        conciliacionId: movimientos.conciliacionId,
        anuladoEn: movimientos.anuladoEn,
        revertidoEn: movimientos.revertidoEn,
      })
      .from(movimientos)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, movimientos.cuentaBancariaId))
      .where(eq(movimientos.id, movimientoId));
    const datos = await this.datosDe(movimientoId);
    if (!fila || !datos) return null;
    const { conciliacionId, anuladoEn, revertidoEn, tipo, ...resto } = fila;
    return {
      ...resto,
      tipo: TIPO_DE_LA_FICHA[tipo],
      numero: datos.numero,
      conciliado: conciliacionId !== null,
      anulado: anuladoEn !== null || revertidoEn !== null,
    };
  }
}
