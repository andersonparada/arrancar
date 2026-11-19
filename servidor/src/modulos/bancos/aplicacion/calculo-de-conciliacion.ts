import { aCentavos, deCentavos, efectoEnCentavos } from '../dominio/centavos.js';

export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

/** Lo mínimo de un movimiento vigente que hace falta para armar el documento de conciliación. */
export interface MovimientoParaConciliar {
  id: string;
  tipo: TipoDeMovimiento;
  fecha: string;
  monto: string;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  /** Si aparece en el estado de cuenta de esta conciliación. */
  marcado: boolean;
  /** Si es una partida de la carga inicial (todas las partes menos el cheque posfechado). */
  deApertura: boolean;
  /** La parte de la carga inicial de la que viene; `null` si no es de la carga. */
  parteDeApertura: string | null;
}

/** Saldo inicial, ingresos, egresos y saldo final de un lado (libros o banco) del cuadro cuadrático. */
export interface Cuadratica {
  saldoInicial: string;
  ingresos: string;
  egresos: string;
  saldoFinal: string;
}

/** Un documento pendiente (sin marcar): cheque, débito o crédito en tránsito. */
export interface Partida {
  movimientoId: string;
  fecha: string;
  monto: string;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  /** Viene de la carga inicial: la pantalla la agrupa como «De la carga inicial». */
  deApertura: boolean;
  parteDeApertura: string | null;
}

export interface PartidasDeConciliacion {
  chequesEnCirculacion: Partida[];
  otrosDebitosEnTransito: Partida[];
  creditosEnTransito: Partida[];
  /** Cheques de fecha posterior al fin de mes que el banco ya pagó (marcados): restan del saldo del estado de cuenta. */
  cobradosAntesDeSuFecha: Partida[];
}

export interface ResultadoDeCalculo {
  libros: Cuadratica;
  banco: Cuadratica;
  partidas: PartidasDeConciliacion;
  /**
   * Saldo según libros + cheques en circulación + otros débitos en tránsito − créditos en tránsito − cheques
   * cobrados antes de su fecha.
   */
  saldoQueDebeMostrarElEstadoDeCuenta: string;
}

function aPartida(movimiento: MovimientoParaConciliar): Partida {
  const { id, fecha, monto, numeroDeCheque, beneficiario, referencia, deApertura, parteDeApertura } = movimiento;
  return { movimientoId: id, fecha, monto, numeroDeCheque, beneficiario, referencia, deApertura, parteDeApertura };
}

function sumaEnCentavos(movimientos: readonly MovimientoParaConciliar[]): number {
  return movimientos.reduce((suma, m) => suma + Math.abs(efectoEnCentavos(m.tipo, m.monto)), 0);
}

/** Cuadro cuadrático de un lado: ingresos son los créditos, egresos los débitos y cheques. */
function calcularCuadratica(
  saldoInicialEnCentavos: number,
  movimientos: readonly MovimientoParaConciliar[],
): Cuadratica {
  const ingresosEnCentavos = sumaEnCentavos(movimientos.filter((m) => m.tipo === 'credito'));
  const egresosEnCentavos = sumaEnCentavos(movimientos.filter((m) => m.tipo !== 'credito'));
  return {
    saldoInicial: deCentavos(saldoInicialEnCentavos),
    ingresos: deCentavos(ingresosEnCentavos),
    egresos: deCentavos(egresosEnCentavos),
    saldoFinal: deCentavos(saldoInicialEnCentavos + ingresosEnCentavos - egresosEnCentavos),
  };
}

/** Un cheque con fecha posterior al fin de mes: el banco puede pagarlo antes (C. Com. art. 501). */
const esPosfechado = (m: MovimientoParaConciliar, finDelMes: string) => m.tipo === 'cheque' && m.fecha > finDelMes;

/**
 * Los candidatos sin marcar (lo que todavía no aparece en el estado de cuenta), agrupados. Un posfechado sin marcar
 * no es partida (todavía no está en libros); marcado, es un cheque cobrado antes de su fecha.
 */
function calcularPartidas(candidatos: readonly MovimientoParaConciliar[], finDelMes: string): PartidasDeConciliacion {
  const anticipados = candidatos.filter((m) => esPosfechado(m, finDelMes));
  const pendientes = candidatos.filter((m) => !m.marcado && !esPosfechado(m, finDelMes));
  return {
    cobradosAntesDeSuFecha: anticipados.filter((m) => m.marcado).map(aPartida),
    chequesEnCirculacion: pendientes.filter((m) => m.tipo === 'cheque').map(aPartida),
    otrosDebitosEnTransito: pendientes.filter((m) => m.tipo === 'debito').map(aPartida),
    creditosEnTransito: pendientes.filter((m) => m.tipo === 'credito').map(aPartida),
  };
}

function sumaDePartidas(partidas: readonly Partida[]): number {
  return partidas.reduce((suma, p) => suma + aCentavos(p.monto), 0);
}

function calcularSaldoDelEstadoDeCuenta(saldoLibrosFinal: string, partidas: PartidasDeConciliacion): string {
  const centavos =
    aCentavos(saldoLibrosFinal) +
    sumaDePartidas(partidas.chequesEnCirculacion) +
    sumaDePartidas(partidas.otrosDebitosEnTransito) -
    sumaDePartidas(partidas.creditosEnTransito) -
    sumaDePartidas(partidas.cobradosAntesDeSuFecha);
  return deCentavos(centavos);
}

/**
 * El documento de conciliación completo. `movimientosDelMes` son los vigentes
 * con fecha dentro de este mes (lado de libros); `candidatos` son los vigentes
 * con fecha hasta el fin de mes que no quedaron marcados en OTRA conciliación
 * (incluye a los marcados en esta) y los cheques de fecha posterior: de ahí salen las partidas y el lado banco.
 */
export function calcularConciliacion(datos: {
  saldoInicialLibrosEnCentavos: number;
  saldoInicialBancoEnCentavos: number;
  movimientosDelMes: readonly MovimientoParaConciliar[];
  candidatos: readonly MovimientoParaConciliar[];
  /** El último día del mes de la conciliación, `AAAA-MM-DD`. */
  finDelMes: string;
}): ResultadoDeCalculo {
  const { saldoInicialLibrosEnCentavos, saldoInicialBancoEnCentavos, movimientosDelMes, candidatos } = datos;
  const libros = calcularCuadratica(saldoInicialLibrosEnCentavos, movimientosDelMes);
  const banco = calcularCuadratica(
    saldoInicialBancoEnCentavos,
    candidatos.filter((m) => m.marcado),
  );
  const partidas = calcularPartidas(candidatos, datos.finDelMes);
  return {
    libros,
    banco,
    partidas,
    saldoQueDebeMostrarElEstadoDeCuenta: calcularSaldoDelEstadoDeCuenta(libros.saldoFinal, partidas),
  };
}
