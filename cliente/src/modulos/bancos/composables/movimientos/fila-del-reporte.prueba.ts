import { describe, expect, it } from 'vitest';
import type { FilaDelReporte } from '../../servicios/movimientos.api';
import { creditoDeFila, debitoDeFila, documentoDeFila } from './fila-del-reporte';

function fila(datos: Partial<FilaDelReporte> & Pick<FilaDelReporte, 'tipo' | 'monto'>): FilaDelReporte {
  return {
    id: 'fila-1',
    cuentaBancariaId: 'cuenta-1',
    fecha: '2026-01-15',
    saldoInicial: false,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    cuentaBancariaNombre: 'Cuenta',
    anuladoEn: null,
    motivoDeAnulacion: null,
    transferenciaId: null,
    chequeId: null,
    numeroDeCheque: null,
    numero: null,
    anioDeNumero: 0,
    conciliacionId: null,
    revertidoEn: null,
    motivoDeReversion: null,
    revierteAId: null,
    puedeAnular: false,
    puedeEliminar: false,
    conceptoId: 'concepto-1',
    conceptoNombre: 'Concepto de prueba',
    puedeReclasificar: true,
    saldo: null,
    ...datos,
  };
}

describe('documentoDeFila', () => {
  it('un cheque muestra su número', () => {
    expect(documentoDeFila(fila({ tipo: 'cheque', monto: '10.00', numeroDeCheque: 7 }))).toEqual({
      titulo: 'Cheque No. 7',
      subtitulo: null,
    });
  });

  it('el saldo inicial se distingue de una nota normal', () => {
    expect(documentoDeFila(fila({ tipo: 'credito', monto: '10.00', saldoInicial: true }))).toMatchObject({
      titulo: 'Saldo inicial',
    });
  });

  it('una nota muestra su tipo y su referencia', () => {
    expect(documentoDeFila(fila({ tipo: 'debito', monto: '10.00', referencia: 'Boleta 1' }))).toEqual({
      titulo: 'Nota de débito',
      subtitulo: 'Boleta 1',
    });
  });
});

describe('débito y crédito de la fila', () => {
  it('un crédito va en la columna crédito', () => {
    expect(creditoDeFila(fila({ tipo: 'credito', monto: '10.00' }))).toBe('10.00');
    expect(debitoDeFila(fila({ tipo: 'credito', monto: '10.00' }))).toBeNull();
  });

  it('un débito o un cheque van en la columna débito', () => {
    expect(debitoDeFila(fila({ tipo: 'debito', monto: '10.00' }))).toBe('10.00');
    expect(debitoDeFila(fila({ tipo: 'cheque', monto: '10.00' }))).toBe('10.00');
    expect(creditoDeFila(fila({ tipo: 'cheque', monto: '10.00' }))).toBeNull();
  });
});
