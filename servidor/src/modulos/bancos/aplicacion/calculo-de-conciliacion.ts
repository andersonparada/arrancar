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
}

export interface PartidasDeConciliacion {
  chequesEnCirculacion: Partida[];
  otrosDebitosEnTransito: Partida[];
  creditosEnTransito: Partida[];
}

export interface ResultadoDeCalculo {
  libros: Cuadratica;
  banco: Cuadratica;
  partidas: PartidasDeConciliacion;
  /** Saldo según libros + cheques en circulación + otros débitos en tránsito − créditos en tránsito. */
  saldoQueDebeMostrarElEstadoDeCuenta: string;
}

function aPartida(movimiento: MovimientoParaConciliar): Partida {
  const { id, fecha, monto, numeroDeCheque, beneficiario, referencia } = movimiento;
  return { movimientoId: id, fecha, monto, numeroDeCheque, beneficiario, referencia };
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

/** Los candidatos sin marcar (lo que todavía no aparece en el estado de cuenta), agrupados. */
function calcularPartidas(candidatos: readonly MovimientoParaConciliar[]): PartidasDeConciliacion {
  const pendientes = candidatos.filter((m) => !m.marcado);
  return {
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
    sumaDePartidas(partidas.creditosEnTransito);
  return deCentavos(centavos);
}

/**
 * El documento de conciliación completo. `movimientosDelMes` son los vigentes
 * con fecha dentro de este mes (lado de libros); `candidatos` son los vigentes
 * con fecha hasta el fin de mes que no quedaron marcados en OTRA conciliación
 * (incluye a los marcados en esta): de ahí salen las partidas y el lado banco.
 */
export function calcularConciliacion(datos: {
  saldoInicialLibrosEnCentavos: number;
  saldoInicialBancoEnCentavos: number;
  movimientosDelMes: readonly MovimientoParaConciliar[];
  candidatos: readonly MovimientoParaConciliar[];
}): ResultadoDeCalculo {
  const { saldoInicialLibrosEnCentavos, saldoInicialBancoEnCentavos, movimientosDelMes, candidatos } = datos;
  const libros = calcularCuadratica(saldoInicialLibrosEnCentavos, movimientosDelMes);
  const banco = calcularCuadratica(
    saldoInicialBancoEnCentavos,
    candidatos.filter((m) => m.marcado),
  );
  const partidas = calcularPartidas(candidatos);
  return {
    libros,
    banco,
    partidas,
    saldoQueDebeMostrarElEstadoDeCuenta: calcularSaldoDelEstadoDeCuenta(libros.saldoFinal, partidas),
  };
}
