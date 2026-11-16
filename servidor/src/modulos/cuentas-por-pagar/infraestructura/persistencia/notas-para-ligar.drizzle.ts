import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptos } from '../../../bancos/infraestructura/persistencia/conceptos.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import type {
  FiltroDeNotasParaLigar,
  NotaConDisponible,
  NotasParaLigar,
} from '../../aplicacion/puertos/puertos-de-notas-para-ligar.js';
import type { NotaParaLigar } from '../../dominio/nota-para-ligar.js';
import { pagos } from './pagos.tablas.js';

/** La clave del concepto de sistema que Bancos usa como marca de «nota para Cuentas por pagar». */
const CLAVE_DE_LA_MARCA = 'pago_a_proveedor';

/** Una nota de débito suelta (sin transferencia, sin origen, que no es saldo inicial ni inverso), vigente y marcada. */
const esLigable = sql<boolean>`(
  ${movimientos.tipo} = 'debito' and not ${movimientos.saldoInicial}
  and ${movimientos.transferenciaId} is null and ${movimientos.revierteAId} is null
  and ${movimientos.moduloDeOrigen} is null
  and ${movimientos.anuladoEn} is null and ${movimientos.revertidoEn} is null
  and exists (
    select 1 from ${conceptos}
    where ${conceptos.id} = ${movimientos.conceptoId} and ${conceptos.claveDeSistema} = ${CLAVE_DE_LA_MARCA}
  )
)`;

/** Lo que suman los pagos vigentes que ligan la nota. */
const aplicado = sql<string>`coalesce((
  select sum(${pagos.monto}) from ${pagos}
  where ${pagos.movimientoId} = ${movimientos.id} and ${pagos.forma} = 'nota_ligada' and ${pagos.estado} = 'vigente'
), 0)`;

const columnas = {
  movimientoId: movimientos.id,
  cuentaBancariaId: movimientos.cuentaBancariaId,
  fecha: movimientos.fecha,
  monto: movimientos.monto,
  numero: movimientos.numero,
  beneficiario: movimientos.beneficiario,
  ligable: esLigable,
};

type FilaDeNota = {
  movimientoId: string;
  cuentaBancariaId: string;
  fecha: string;
  monto: string;
  numero: number | null;
  beneficiario: string | null;
  ligable: boolean;
};

const aNota = ({ monto, ...resto }: FilaDeNota): NotaParaLigar => ({ ...resto, montoCentavos: aCentavos(monto) });

/**
 * Lee las notas de débito de Bancos (el `dependeDe` lo permite, solo lectura; las tablas tienen RLS por empresa) y bloquea
 * la que se va a ligar para que dos pagos a la vez no pasen de su monto.
 */
export class NotasParaLigarDrizzle implements NotasParaLigar {
  async bloquear(movimientoId: string): Promise<NotaParaLigar | null> {
    const [fila] = await transaccionEnCurso()
      .select(columnas)
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId))
      .for('update');
    return fila ? aNota(fila) : null;
  }

  async listar(filtro: FiltroDeNotasParaLigar): Promise<NotaConDisponible[]> {
    const filas = await transaccionEnCurso()
      .select({
        ...columnas,
        cuentaBancariaNombre: cuentasBancarias.nombre,
        referencia: movimientos.referencia,
        aplicado,
      })
      .from(movimientos)
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, movimientos.cuentaBancariaId))
      .where(and(esLigable, ...condicionesDe(filtro)))
      .orderBy(desc(movimientos.fecha), desc(movimientos.id))
      .limit(filtro.limite);
    return filas.map(({ aplicado: aplicadoTexto, cuentaBancariaNombre, referencia, ...nota }) => ({
      ...aNota(nota),
      cuentaBancariaNombre,
      referencia,
      aplicadoCentavos: aCentavos(aplicadoTexto),
    }));
  }
}

function condicionesDe({ cuentaBancariaId, desde, hasta, soloConDisponible }: FiltroDeNotasParaLigar): SQL[] {
  const condiciones: SQL[] = [];
  if (cuentaBancariaId) condiciones.push(eq(movimientos.cuentaBancariaId, cuentaBancariaId));
  if (desde) condiciones.push(gte(movimientos.fecha, desde));
  if (hasta) condiciones.push(lte(movimientos.fecha, hasta));
  if (soloConDisponible) condiciones.push(sql`${movimientos.monto} > ${aplicado}`);
  return condiciones;
}
