import { describe, expect, it } from 'vitest';
import { calcularSaldoCorrido, diaAnteriorA } from './calculo-de-reporte-de-movimientos.js';
import type { MovimientoDto } from './dto/movimiento.dto.js';

function movimiento(datos: Partial<MovimientoDto> & Pick<MovimientoDto, 'tipo' | 'monto'>): MovimientoDto {
  return {
    id: crypto.randomUUID(),
    cuentaBancariaId: crypto.randomUUID(),
    fecha: '2026-01-15',
    saldoInicial: false,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId: 'concepto-general',
    conceptoNombre: 'General',
    puedeReclasificar: true,
    anuladoEn: null,
    motivoDeAnulacion: null,
    cuentaBancariaNombre: null,
    transferenciaId: null,
    chequeId: null,
    numeroDeCheque: null,
    conciliacionId: null,
    revertidoEn: null,
    motivoDeReversion: null,
    revierteAId: null,
    numero: null,
    anioDeNumero: 0,
    puedeAnular: false,
    puedeEliminar: false,
    ...datos,
  };
}

describe('diaAnteriorA', () => {
  it('resta un día, incluso cruzando de mes y de año', () => {
    expect(diaAnteriorA('2026-01-15')).toBe('2026-01-14');
    expect(diaAnteriorA('2026-03-01')).toBe('2026-02-28');
    expect(diaAnteriorA('2026-01-01')).toBe('2025-12-31');
  });
});

describe('calcularSaldoCorrido', () => {
  it('acumula créditos y descuenta débitos y cheques, en orden', () => {
    const filas = calcularSaldoCorrido(100_00, [
      movimiento({ tipo: 'credito', monto: '50.00' }),
      movimiento({ tipo: 'debito', monto: '30.00' }),
      movimiento({ tipo: 'cheque', monto: '20.00' }),
    ]);

    expect(filas.map((f) => f.saldo)).toEqual(['150.00', '120.00', '100.00']);
  });

  it('un movimiento anulado no mueve el saldo y queda con el saldo que había', () => {
    const filas = calcularSaldoCorrido(100_00, [
      movimiento({ tipo: 'credito', monto: '50.00' }),
      movimiento({ tipo: 'debito', monto: '999.00', anuladoEn: '2026-01-16T00:00:00.000Z' }),
      movimiento({ tipo: 'credito', monto: '10.00' }),
    ]);

    expect(filas.map((f) => f.saldo)).toEqual(['150.00', '150.00', '160.00']);
  });

  it('sin movimientos, deja el saldo anterior', () => {
    expect(calcularSaldoCorrido(500, [])).toEqual([]);
  });
});
