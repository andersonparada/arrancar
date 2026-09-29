import { and, asc, count, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { FiltroDeIntereses, InteresDelReporteDto } from '../../aplicacion/dto/intereses.dto.js';
import type { ConsultasDeIntereses } from '../../aplicacion/puertos/consultas-de-intereses.js';
import { conceptos } from './conceptos.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/** Notas de crédito vigentes del rango (y cuenta): ni revertidas ni inversos; la base ya limita a la empresa (RLS). */
const vigentesDelRango = ({ desde, hasta, cuentaBancariaId }: FiltroDeIntereses) =>
  and(
    eq(movimientos.tipo, 'credito'),
    isNull(movimientos.revertidoEn),
    isNull(movimientos.revierteAId),
    isNull(movimientos.anuladoEn),
    gte(movimientos.fecha, desde),
    lte(movimientos.fecha, hasta),
    cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
  );

/** Las notas de intereses de la empresa: solo las que llevan bruto e ISR (índice parcial `movimientos_intereses_idx`). */
export class ConsultasDeInteresesDrizzle implements ConsultasDeIntereses {
  async exigirCuenta(cuentaBancariaId: string): Promise<void> {
    await exigirQueExista(cuentasBancarias, cuentaBancariaId, 'La cuenta bancaria');
  }

  async listar(filtro: FiltroDeIntereses): Promise<InteresDelReporteDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        movimientoId: movimientos.id,
        fecha: movimientos.fecha,
        cuentaBancariaId: movimientos.cuentaBancariaId,
        cuentaBancariaNombre: cuentasBancarias.nombre,
        numero: movimientos.numero,
        referencia: movimientos.referencia,
        interesBruto: movimientos.interesBruto,
        isrRetenido: movimientos.isrRetenido,
        neto: movimientos.monto,
      })
      .from(movimientos)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, movimientos.cuentaBancariaId))
      .where(and(vigentesDelRango(filtro), isNotNull(movimientos.interesBruto)))
      .orderBy(asc(movimientos.fecha), asc(cuentasBancarias.nombre), asc(movimientos.numero));
    return filas.map((fila) => ({ ...fila, interesBruto: fila.interesBruto!, isrRetenido: fila.isrRetenido! }));
  }

  async contarSinDatos(filtro: FiltroDeIntereses): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(movimientos)
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .where(and(vigentesDelRango(filtro), eq(conceptos.pideDatosDeIntereses, true), isNull(movimientos.interesBruto)));
    return fila?.cantidad ?? 0;
  }
}
