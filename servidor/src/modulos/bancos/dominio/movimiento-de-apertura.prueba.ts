import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Chequera } from './chequera.js';
import { MontoInvalido, MovimientoAnulado, NoEsUnSaldoInicial } from './errores.js';
import { Movimiento, type DatosDeMovimiento } from './movimiento.js';

const empresaId = Identificador.nuevo<'Empresa'>();

const datos = (cambios: Partial<DatosDeMovimiento> = {}): DatosDeMovimiento => ({
  cuentaBancariaId: 'cuenta-1',
  tipo: 'credito',
  fecha: '2025-12-31',
  monto: '1000.00',
  saldoInicial: true,
  referencia: null,
  beneficiario: null,
  observaciones: null,
  conceptoId: 'concepto-1',
  ...cambios,
});

const deApertura = (parte: 'saldo_del_banco' | 'saldo_global' | 'cheque_posfechado', cambios = {}) =>
  Movimiento.crear(empresaId, datos(cambios), { apertura: { parte, saldoInicialId: 'cabecera-1' } });

describe('movimiento de la apertura', () => {
  it('nace con su parte y la cabecera de la que cuelga; un movimiento normal no tiene ni una ni otra', () => {
    const banco = deApertura('saldo_del_banco');

    expect(banco.parteDeApertura).toBe('saldo_del_banco');
    expect(banco.instantanea().saldoInicialId).toBe('cabecera-1');
    expect(Movimiento.crear(empresaId, datos({ saldoInicial: false })).parteDeApertura).toBeNull();
    expect(Movimiento.crear(empresaId, datos({ saldoInicial: false })).instantanea().saldoInicialId).toBeNull();
  });

  it('una partida de cheque se corrige aunque sea un cheque (una nota normal de cheque no)', () => {
    const posfechado = deApertura('cheque_posfechado', { tipo: 'cheque', saldoInicial: false, fecha: '2026-02-10' });

    posfechado.corregirPartida(datos({ tipo: 'cheque', saldoInicial: true, fecha: '2026-02-15', monto: '75.50' }));

    expect(posfechado.instantanea()).toMatchObject({ fecha: '2026-02-15', monto: '75.50', saldoInicial: false });
    const normal = Movimiento.crear(empresaId, datos({ tipo: 'cheque', saldoInicial: false }));
    expect(() => normal.corregirPartida(datos())).toThrow(NoEsUnSaldoInicial);
  });

  it('corregir una partida exige monto mayor que cero y que siga vigente', () => {
    const partida = deApertura('saldo_del_banco');
    expect(() => partida.corregirPartida(datos({ monto: '0.00' }))).toThrow(MontoInvalido);

    const cheque = deApertura('cheque_posfechado', { tipo: 'cheque', saldoInicial: false });
    cheque.anularPorCheque('Perdido');
    expect(() => cheque.corregirPartida(datos({ tipo: 'cheque' }))).toThrow(MovimientoAnulado);
  });

  it('convertir un saldo global lo vuelve saldo del banco con la fecha, el tipo y el monto nuevos', () => {
    const global = deApertura('saldo_global', { fecha: '2025-10-01', monto: '800.00' });

    global.convertirASaldoDelBanco({ tipo: 'debito', fecha: '2025-12-31', monto: '120.00' });

    expect(global.parteDeApertura).toBe('saldo_del_banco');
    expect(global.instantanea()).toMatchObject({
      tipo: 'debito',
      fecha: '2025-12-31',
      monto: '120.00',
      saldoInicial: true,
    });
    expect(global.efectoEnCentavos).toBe(-12000);
  });

  it('las rutas heredadas solo tocan el saldo global: el saldo del banco o una partida no son «el saldo inicial» de ellas', () => {
    expect(() => deApertura('saldo_global').exigirClase(true)).not.toThrow();
    expect(() => deApertura('saldo_del_banco').exigirClase(true)).toThrow(NoEsUnSaldoInicial);
    expect(() => Movimiento.crear(empresaId, datos()).exigirClase(true)).not.toThrow();
  });
});

describe('chequera de apertura', () => {
  it('nace inactiva, con su serie normalizada y solo el número cargado', () => {
    const chequera = Chequera.deApertura(empresaId, { cuentaBancariaId: 'cuenta-1', serie: '  ', numero: 150 });

    expect(chequera.instantanea()).toMatchObject({
      serie: null,
      desde: 150,
      hasta: 150,
      activa: false,
      deApertura: true,
    });
    expect(chequera.esDeApertura).toBe(true);
    expect(chequera.descripcion).toBe('de la carga inicial');
  });

  it('una chequera normal no es de apertura y se describe por su serie y rango', () => {
    const chequera = Chequera.crear(empresaId, { cuentaBancariaId: 'cuenta-1', serie: 'A', desde: 1, hasta: 25 }, 100);

    expect(chequera.esDeApertura).toBe(false);
    expect(chequera.descripcion).toBe('A1-25');
  });
});
