import type { MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type { ConciliacionResumenDto, MovimientoConMarcaDto } from '../aplicacion/dto/conciliacion.dto.js';
import { Conciliacion } from '../dominio/conciliacion.js';

export const copia = (conciliacion: Conciliacion) => Conciliacion.reconstruir(conciliacion.instantanea());

export function ordenDescendente(a: { anio: number; mes: number }, b: { anio: number; mes: number }): number {
  return b.anio - a.anio || b.mes - a.mes;
}

export function aMovimientoParaConciliar(m: MovimientoConMarcaDto): MovimientoParaConciliar {
  const { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado } = m;
  const { saldoInicial: deApertura, parteDeApertura } = m;
  return { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado, deApertura, parteDeApertura };
}

export function aResumen(conciliacion: Conciliacion): ConciliacionResumenDto {
  const { id, anio, mes, estado, estadoDeCuentaArchivoId } = conciliacion.instantanea();
  const tieneEstadoDeCuenta = estadoDeCuentaArchivoId !== null;
  return { id: id.valor, anio, mes, estado, elaboradaEn: null, autorizadaEn: null, tieneEstadoDeCuenta };
}

/** El encabezado de un documento de conciliación en memoria: sin nombres ni personas. */
export function aEncabezado(conciliacion: Conciliacion) {
  const { id, cuentaBancariaId, anio, mes, estado, saldoEstadoDeCuenta, previaAlSaldoTranscrito } =
    conciliacion.instantanea();
  const sinNombres = { cuentaBancariaNombre: null, bancoNombre: null, numeroDeCuenta: null, empresaNombre: null };
  const sinPersonas = { elaboradaPorNombre: null, elaboradaEn: null, autorizadaPorNombre: null, autorizadaEn: null };
  return {
    ...{ id: id.valor, cuentaBancariaId, anio, mes, estado, saldoEstadoDeCuenta, previaAlSaldoTranscrito },
    ...sinNombres,
    ...sinPersonas,
  };
}
