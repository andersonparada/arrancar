import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Conciliacion, type FotoDelCalculo } from '../../dominio/conciliacion.js';
import type { conciliaciones } from './conciliaciones.tablas.js';

type Fila = typeof conciliaciones.$inferSelect;

function fotoDesdeLaFila(fila: Fila): FotoDelCalculo | null {
  if (fila.fotoSaldoSegunLibros === null || fila.fotoSaldoCalculadoEstadoDeCuenta === null) return null;
  return {
    saldoSegunLibros: fila.fotoSaldoSegunLibros,
    saldoCalculadoEstadoDeCuenta: fila.fotoSaldoCalculadoEstadoDeCuenta,
    totalChequesEnCirculacion: fila.fotoTotalChequesEnCirculacion ?? '0.00',
    totalOtrosDebitosEnTransito: fila.fotoTotalOtrosDebitosEnTransito ?? '0.00',
    totalCreditosEnTransito: fila.fotoTotalCreditosEnTransito ?? '0.00',
  };
}

const SIN_FOTO = {
  fotoSaldoSegunLibros: null,
  fotoSaldoCalculadoEstadoDeCuenta: null,
  fotoTotalChequesEnCirculacion: null,
  fotoTotalOtrosDebitosEnTransito: null,
  fotoTotalCreditosEnTransito: null,
};

function columnasDeLaFoto(foto: FotoDelCalculo | null) {
  if (!foto) return SIN_FOTO;
  return {
    fotoSaldoSegunLibros: foto.saldoSegunLibros,
    fotoSaldoCalculadoEstadoDeCuenta: foto.saldoCalculadoEstadoDeCuenta,
    fotoTotalChequesEnCirculacion: foto.totalChequesEnCirculacion,
    fotoTotalOtrosDebitosEnTransito: foto.totalOtrosDebitosEnTransito,
    fotoTotalCreditosEnTransito: foto.totalCreditosEnTransito,
  };
}

function propiedadesDeLaEntidad(fila: Fila) {
  const { id, empresaId, cuentaBancariaId, anio, mes, estado, elaboradaPor, elaboradaEn, autorizadaPor, autorizadaEn } =
    fila;
  return {
    id: Identificador.desde<'Conciliacion'>(id),
    empresaId: Identificador.desde<'Empresa'>(empresaId),
    cuentaBancariaId,
    anio,
    mes,
    estado: estado as 'en_proceso' | 'elaborada' | 'autorizada',
    elaboradaPor,
    elaboradaEn,
    autorizadaPor,
    autorizadaEn,
  };
}

/** Traduce entre la fila de la tabla y la entidad; la foto viaja en cinco columnas planas. */
export const mapeadorDeConciliacion = {
  aEntidad(fila: Fila): Conciliacion {
    return Conciliacion.reconstruir({ ...propiedadesDeLaEntidad(fila), foto: fotoDesdeLaFila(fila) });
  },

  aFila(conciliacion: Conciliacion): typeof conciliaciones.$inferInsert {
    const { id, empresaId, foto, ...datos } = conciliacion.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, ...columnasDeLaFoto(foto) };
  },
};
