import { asc, eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ImpresionRegistradaDto } from '../../aplicacion/dto/impresion-de-cheque.dto.js';
import type {
  ChequeParaImprimir,
  ConsultasDeImpresionDeCheques,
} from '../../aplicacion/puertos/impresion-de-cheques.js';
import { aCentavos } from '../../dominio/centavos.js';
import { bancos } from './bancos.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { cheques } from './cheques.tablas.js';
import { conceptos } from './conceptos.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { impresionesDeCheques } from './impresiones-de-cheques.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const nombreCompleto = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

const columnasDelCheque = {
  chequeId: cheques.id,
  numero: cheques.numero,
  estado: cheques.estado,
  impresoEn: cheques.impresoEn,
  noNegociable: cheques.noNegociable,
  chequeraId: chequeras.id,
  serie: chequeras.serie,
  chequeraDeApertura: chequeras.deApertura,
  formatoDeChequeId: chequeras.formatoDeChequeId,
  plantillaDeCheque: chequeras.plantillaDeCheque,
  movimientoId: movimientos.id,
  fecha: movimientos.fecha,
  monto: movimientos.monto,
  beneficiario: movimientos.beneficiario,
  conceptoNombre: conceptos.nombre,
  referencia: movimientos.referencia,
  observaciones: movimientos.observaciones,
  paraAbonoEnCuenta: movimientos.paraAbonoEnCuenta,
  moduloDeOrigen: movimientos.moduloDeOrigen,
  elaboroNombres: usuarios.nombres,
  elaboroApellidos: usuarios.apellidos,
  cuentaNombre: cuentasBancarias.nombre,
  cuentaNumero: cuentasBancarias.numero,
  bancoNombre: bancos.nombre,
  impresiones: sql<number>`(select count(*) from ${impresionesDeCheques} where ${impresionesDeCheques.chequeId} = ${cheques.id})::int`,
};

/** El cheque con su chequera, cuenta y banco, y con su movimiento (si se emitió) y quien lo emitió. */
const consultaDeCheques = () =>
  transaccionEnCurso()
    .select(columnasDelCheque)
    .from(cheques)
    .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
    .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, chequeras.cuentaBancariaId))
    .innerJoin(bancos, eq(bancos.id, cuentasBancarias.bancoId))
    .leftJoin(movimientos, eq(movimientos.id, cheques.movimientoId))
    .leftJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
    .leftJoin(usuarios, eq(usuarios.id, movimientos.creadoPor));

type Fila = Awaited<ReturnType<typeof consultaDeCheques>>[number];

function movimientoDe(fila: Fila): NonNullable<ChequeParaImprimir['movimiento']> {
  return {
    id: fila.movimientoId!,
    fecha: fila.fecha!,
    montoCentavos: aCentavos(fila.monto!),
    beneficiario: fila.beneficiario ?? '',
    conceptoNombre: fila.conceptoNombre!,
    referencia: fila.referencia,
    observaciones: fila.observaciones,
    paraAbonoEnCuenta: fila.paraAbonoEnCuenta ?? false,
    moduloDeOrigen: fila.moduloDeOrigen,
    elaboro: nombreCompleto(fila.elaboroNombres, fila.elaboroApellidos),
  };
}

function aChequeParaImprimir(fila: Fila): ChequeParaImprimir {
  return {
    chequeId: fila.chequeId,
    numero: fila.numero,
    estado: fila.estado,
    impresoEn: fila.impresoEn,
    noNegociable: fila.noNegociable,
    chequeraId: fila.chequeraId,
    serie: fila.serie,
    chequeraDeApertura: fila.chequeraDeApertura,
    formatoDeChequeId: fila.formatoDeChequeId,
    plantillaDeCheque: fila.plantillaDeCheque,
    movimiento: fila.movimientoId ? movimientoDe(fila) : null,
    cuenta: { nombre: fila.cuentaNombre, numero: fila.cuentaNumero, banco: fila.bancoNombre },
    impresiones: fila.impresiones,
  };
}

export class ConsultasDeImpresionDeChequesDrizzle implements ConsultasDeImpresionDeCheques {
  async chequesParaImprimir(ids: readonly string[]): Promise<ChequeParaImprimir[]> {
    const filas = await consultaDeCheques()
      .where(inArray(cheques.id, [...ids]))
      .orderBy(asc(cheques.numero));
    return filas.map(aChequeParaImprimir);
  }

  async historial(chequeId: string): Promise<ImpresionRegistradaDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        id: impresionesDeCheques.id,
        tipo: impresionesDeCheques.tipo,
        conCheque: impresionesDeCheques.conCheque,
        motivo: impresionesDeCheques.motivo,
        loteId: impresionesDeCheques.loteId,
        impresoEn: impresionesDeCheques.impresoEn,
        impresoPorId: impresionesDeCheques.impresoPor,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
      })
      .from(impresionesDeCheques)
      .leftJoin(usuarios, eq(usuarios.id, impresionesDeCheques.impresoPor))
      .where(eq(impresionesDeCheques.chequeId, chequeId))
      .orderBy(asc(impresionesDeCheques.impresoEn));
    return filas.map(({ nombres, apellidos, impresoEn, ...resto }) => ({
      ...resto,
      impresoEn: impresoEn.toISOString(),
      impresoPorNombre: nombreCompleto(nombres, apellidos),
    }));
  }
}
