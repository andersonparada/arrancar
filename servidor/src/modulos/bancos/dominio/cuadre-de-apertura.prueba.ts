import { describe, expect, it } from 'vitest';
import {
  calcularCuadre,
  compararConLibros,
  tieneSaldoPrincipal,
  totalesDeLaEmpresa,
  type PartidaParaElCuadre,
} from './cuadre-de-apertura.js';
import { hallazgosDeCierre, type CuentaParaLaRevision } from './hallazgos-de-cierre.js';

const partida = (cambios: Partial<PartidaParaElCuadre> & Pick<PartidaParaElCuadre, 'parte' | 'monto'>) =>
  ({ tipo: 'credito', anulada: false, ...cambios }) as PartidaParaElCuadre;

describe('cuadre de la apertura', () => {
  const partidas = [
    partida({ parte: 'saldo_del_banco', monto: '10000.00' }),
    partida({ parte: 'deposito_en_transito', monto: '500.00' }),
    partida({ parte: 'cheque_en_circulacion', monto: '1200.00', tipo: 'cheque' }),
    partida({ parte: 'cheque_en_circulacion', monto: '300.00', tipo: 'cheque' }),
    partida({ parte: 'debito_en_transito', monto: '50.00', tipo: 'debito' }),
    partida({ parte: 'error_del_banco', monto: '80.00', tipo: 'credito' }),
    partida({ parte: 'error_del_banco', monto: '20.00', tipo: 'debito' }),
    partida({ parte: 'cheque_posfechado', monto: '999.00', tipo: 'cheque' }),
  ];

  it('saldo en libros = banco + depósitos − cheques − débitos ± errores, sin el posfechado', () => {
    expect(calcularCuadre(partidas)).toEqual({
      saldoSegunEstadoDeCuenta: '10000.00',
      totalDepositosEnTransito: '500.00',
      totalChequesEnCirculacion: '1500.00',
      totalDebitosEnTransito: '50.00',
      totalErroresDelBanco: '60.00',
      saldoEnLibrosAlCorte: '9010.00',
      totalPosfechados: '999.00',
    });
  });

  it('un error que resta, solo, baja el saldo; una partida anulada no pesa', () => {
    const cuadre = calcularCuadre([
      partida({ parte: 'saldo_del_banco', monto: '100.00' }),
      partida({ parte: 'error_del_banco', monto: '30.00', tipo: 'debito' }),
      partida({ parte: 'cheque_en_circulacion', monto: '40.00', tipo: 'cheque', anulada: true }),
    ]);
    expect(cuadre.totalErroresDelBanco).toBe('-30.00');
    expect(cuadre.totalChequesEnCirculacion).toBe('0.00');
    expect(cuadre.saldoEnLibrosAlCorte).toBe('70.00');
  });

  it('un saldo del banco negativo (débito) deja el saldo en libros negativo', () => {
    const cuadre = calcularCuadre([partida({ parte: 'saldo_del_banco', monto: '250.00', tipo: 'debito' })]);
    expect(cuadre.saldoSegunEstadoDeCuenta).toBe('-250.00');
    expect(cuadre.saldoEnLibrosAlCorte).toBe('-250.00');
  });

  it('el saldo global no es «saldo según el estado de cuenta» pero sí cuenta en libros', () => {
    const partidasGlobales = [partida({ parte: 'saldo_global', monto: '700.00' })];
    const cuadre = calcularCuadre(partidasGlobales);
    expect(cuadre.saldoSegunEstadoDeCuenta).toBeNull();
    expect(cuadre.saldoEnLibrosAlCorte).toBe('700.00');
    expect(tieneSaldoPrincipal(partidasGlobales)).toBe(true);
    expect(tieneSaldoPrincipal([])).toBe(false);
  });

  it('compara con el dato de los libros anteriores; sin el dato no hay diferencia', () => {
    expect(compararConLibros('9010.00', '9010.00')).toEqual({ diferencia: '0.00', cuadra: true });
    expect(compararConLibros('9010.00', '9000.00')).toEqual({ diferencia: '10.00', cuadra: false });
    expect(compararConLibros('9010.00', '9100.00')).toEqual({ diferencia: '-90.00', cuadra: false });
    expect(compararConLibros('9010.00', null)).toEqual({ diferencia: null, cuadra: false });
  });
});

describe('totales de la empresa, sin compensar', () => {
  it('Bancos suma los positivos y Sobregiros los negativos en valor absoluto', () => {
    expect(totalesDeLaEmpresa(['1000.00', '-300.00', '500.50', '-0.50'])).toEqual({
      totalBancos: '1500.50',
      totalSobregiros: '300.50',
    });
  });

  it('sin cuentas negativas, Sobregiros es cero (y no hay total neto)', () => {
    expect(totalesDeLaEmpresa(['10.00', '0.00'])).toEqual({ totalBancos: '10.00', totalSobregiros: '0.00' });
    expect(totalesDeLaEmpresa([])).toEqual({ totalBancos: '0.00', totalSobregiros: '0.00' });
  });
});

describe('hallazgos de cierre', () => {
  const cuenta = (cambios: Partial<CuentaParaLaRevision> = {}): CuentaParaLaRevision => ({
    cuentaBancariaId: 'c1',
    cuentaNombre: 'Cuenta 1',
    forma: 'con_partidas',
    saldoEnLibrosAlCorte: '100.00',
    saldoSegunLibrosAnteriores: '100.00',
    diferencia: '0.00',
    tieneEvidencia: true,
    ...cambios,
  });
  const codigos = (cuentas: CuentaParaLaRevision[], permiteSobregiro = false) =>
    hallazgosDeCierre(cuentas, permiteSobregiro).map((h) => [h.codigo, h.pideMotivo]);

  it('una cuenta cuadrada y con evidencia no da hallazgos', () => {
    expect(codigos([cuenta()])).toEqual([]);
  });

  it('no cuadra y sin dato de libros piden motivo', () => {
    expect(codigos([cuenta({ diferencia: '5.00' })])).toEqual([['no_cuadra', true]]);
    expect(codigos([cuenta({ saldoSegunLibrosAnteriores: null, diferencia: null })])).toEqual([
      ['sin_dato_de_libros', true],
    ]);
  });

  it('sin evidencia, saldo global y sobregiro sin permiso solo avisan', () => {
    expect(codigos([cuenta({ tieneEvidencia: false })])).toEqual([['sin_evidencia', false]]);
    expect(codigos([cuenta({ forma: 'global', saldoSegunLibrosAnteriores: null, diferencia: null })])).toEqual([
      ['saldo_global', false],
    ]);
    const sobregirada = cuenta({ saldoEnLibrosAlCorte: '-1.00', saldoSegunLibrosAnteriores: '-1.00' });
    expect(codigos([sobregirada])).toEqual([['sobregiro_sin_permiso', false]]);
    expect(codigos([sobregirada], true)).toEqual([]);
  });

  it('las cuentas sin saldo inicial no dan hallazgo', () => {
    expect(codigos([cuenta({ forma: 'sin_saldo', tieneEvidencia: false, saldoSegunLibrosAnteriores: null })])).toEqual(
      [],
    );
  });
});
