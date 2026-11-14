import type { MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type { ConciliacionResumenDto, MovimientoConMarcaDto } from '../aplicacion/dto/conciliacion.dto.js';
import { Conciliacion } from '../dominio/conciliacion.js';

export const copia = (conciliacion: Conciliacion) => Conciliacion.reconstruir(conciliacion.instantanea());

export function ordenDescendente(a: { anio: number; mes: number }, b: { anio: number; mes: number }): number {
  return b.anio - a.anio || b.mes - a.mes;
}

export function aMovimientoParaConciliar(m: MovimientoConMarcaDto): MovimientoParaConciliar {
  const { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado } = m;
  return { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado };
}

export function aResumen(conciliacion: Conciliacion): ConciliacionResumenDto {
  const { id, anio, mes, estado, estadoDeCuentaArchivoId } = conciliacion.instantanea();
  const tieneEstadoDeCuenta = estadoDeCuentaArchivoId !== null;
  return { id: id.valor, anio, mes, estado, elaboradaEn: null, autorizadaEn: null, tieneEstadoDeCuenta };
}
