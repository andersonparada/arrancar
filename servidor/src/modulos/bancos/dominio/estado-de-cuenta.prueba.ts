import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Conciliacion, type FotoDelCalculo } from './conciliacion.js';
import {
  FaltaElEstadoDeCuenta,
  FaltaElSaldoDelEstadoDeCuenta,
  SaldoDelEstadoDeCuentaNoCoincide,
} from './errores-de-estado-de-cuenta.js';
import { ConciliacionNoEstaEnProceso } from './errores.js';
import {
  diferenciaConElEstadoDeCuenta,
  exigirEvidenciaParaTerminar,
  exigirSaldoQueCoincide,
  SaldoTranscrito,
} from './estado-de-cuenta.js';

const foto = (saldoCalculadoEstadoDeCuenta: string): FotoDelCalculo => ({
  saldoSegunLibros: saldoCalculadoEstadoDeCuenta,
  saldoCalculadoEstadoDeCuenta,
  totalChequesEnCirculacion: '0.00',
  totalOtrosDebitosEnTransito: '0.00',
  totalCreditosEnTransito: '0.00',
});

const SIN_EXIGIR = { saldoCalculado: '10.00', exigeEstadoDeCuenta: false };
const EXIGIENDO = { saldoCalculado: '10.00', exigeEstadoDeCuenta: true };

const nueva = () =>
  Conciliacion.crear(Identificador.nuevo(), { cuentaBancariaId: Identificador.nuevo().valor, anio: 2026, mes: 1 });

function elaborada(saldo: string | null, previa = false): Conciliacion {
  return Conciliacion.reconstruir({
    ...nueva().instantanea(),
    estado: 'elaborada',
    elaboradaPor: 'quien-elabora',
    saldoEstadoDeCuenta: saldo,
    previaAlSaldoTranscrito: previa,
  });
}

describe('SaldoTranscrito', () => {
  it('compara en centavos, sin decimales de punto flotante', () => {
    expect(SaldoTranscrito.desde('0.30').coincideCon('0.3')).toBe(true);
    expect(SaldoTranscrito.desde('1250.5').texto).toBe('1250.50');
    expect(SaldoTranscrito.desde('-15.05').texto).toBe('-15.05');
  });

  it('la diferencia es calculado menos transcrito', () => {
    expect(SaldoTranscrito.desde('990.00').diferenciaCon('1000.00')).toBe('10.00');
    expect(SaldoTranscrito.desde('1010.00').diferenciaCon('1000.00')).toBe('-10.00');
    expect(diferenciaConElEstadoDeCuenta(null, '1000.00')).toBeNull();
  });

  it('exigirSaldoQueCoincide avisa si falta y da el detalle si difiere', () => {
    expect(() => exigirSaldoQueCoincide(null, '1.00')).toThrow(FaltaElSaldoDelEstadoDeCuenta);
    expect(() => exigirSaldoQueCoincide('1.00', '1.00')).not.toThrow();
    try {
      exigirSaldoQueCoincide('990.00', '1000.00');
    } catch (error) {
      expect(error).toBeInstanceOf(SaldoDelEstadoDeCuentaNoCoincide);
      expect((error as SaldoDelEstadoDeCuentaNoCoincide).detalles).toEqual({
        transcrito: '990.00',
        calculado: '1000.00',
        diferencia: '10.00',
      });
    }
  });
});

describe('Conciliacion y el saldo del estado de cuenta', () => {
  it('solo se transcribe en proceso; null lo borra', () => {
    const conciliacion = nueva();
    conciliacion.transcribirSaldo('100.5');
    expect(conciliacion.instantanea().saldoEstadoDeCuenta).toBe('100.50');
    conciliacion.transcribirSaldo(null);
    expect(conciliacion.instantanea().saldoEstadoDeCuenta).toBeNull();
    expect(() => elaborada('1.00').transcribirSaldo('2.00')).toThrow(ConciliacionNoEstaEnProceso);
  });

  it('elaborar exige el saldo y que coincida con el calculado', () => {
    const conciliacion = nueva();
    expect(() => conciliacion.elaborar('u', SIN_EXIGIR)).toThrow(FaltaElSaldoDelEstadoDeCuenta);
    conciliacion.transcribirSaldo('9.99');
    expect(() => conciliacion.elaborar('u', SIN_EXIGIR)).toThrow(SaldoDelEstadoDeCuentaNoCoincide);
    expect(conciliacion.estado).toBe('en_proceso');
    conciliacion.transcribirSaldo('10.00');
    conciliacion.elaborar('u', SIN_EXIGIR);
    expect(conciliacion.estado).toBe('elaborada');
  });

  it('autorizar compara el saldo con la foto', () => {
    const quien = { usuarioId: 'otro', esSuperacceso: false };
    expect(() => elaborada('9.00').autorizar(quien, foto('10.00'))).toThrow(SaldoDelEstadoDeCuentaNoCoincide);
    const buena = elaborada('10.00');
    buena.autorizar(quien, foto('10.00'));
    expect(buena.estaAutorizada).toBe(true);
  });

  it('una elaborada previa no se autoriza (se devuelve) y al devolver sigue el flujo nuevo', () => {
    const previa = elaborada(null, true);
    const quien = { usuarioId: 'otro', esSuperacceso: false };
    expect(() => previa.autorizar(quien, foto('10.00'))).toThrow(/Devuélvala/);
    previa.devolver();
    expect(previa.instantanea().previaAlSaldoTranscrito).toBe(false);
    expect(() => previa.elaborar('u', SIN_EXIGIR)).toThrow(FaltaElSaldoDelEstadoDeCuenta);
  });
});

describe('el archivo del estado de cuenta en la conciliación', () => {
  it('adjuntar devuelve el id anterior (null la primera vez) y quitar devuelve el que había', () => {
    const conciliacion = nueva();
    expect(conciliacion.adjuntarEstadoDeCuenta('a')).toBeNull();
    expect(conciliacion.adjuntarEstadoDeCuenta('b')).toBe('a');
    expect(conciliacion.instantanea().estadoDeCuentaArchivoId).toBe('b');
    expect(conciliacion.quitarEstadoDeCuenta()).toBe('b');
    expect(conciliacion.quitarEstadoDeCuenta()).toBeNull();
    expect(conciliacion.instantanea().estadoDeCuentaArchivoId).toBeNull();
  });

  it('solo se adjunta y se quita en proceso', () => {
    const terminada = elaborada('10.00');
    expect(() => terminada.adjuntarEstadoDeCuenta('a')).toThrow(ConciliacionNoEstaEnProceso);
    expect(() => terminada.quitarEstadoDeCuenta()).toThrow(ConciliacionNoEstaEnProceso);
  });

  it('terminar exige el archivo solo si la empresa lo pide, y después del saldo', () => {
    const conciliacion = nueva();
    expect(() => conciliacion.elaborar('u', EXIGIENDO)).toThrow(FaltaElSaldoDelEstadoDeCuenta);
    conciliacion.transcribirSaldo('10.00');
    expect(() => conciliacion.elaborar('u', EXIGIENDO)).toThrow(FaltaElEstadoDeCuenta);
    conciliacion.adjuntarEstadoDeCuenta('a');
    conciliacion.elaborar('u', EXIGIENDO);
    expect(conciliacion.estado).toBe('elaborada');
  });

  it('exigirEvidenciaParaTerminar: sin la variable no hace falta el archivo', () => {
    const base = { saldo: '10.00', calculado: '10.00', tieneArchivo: false };
    expect(() => exigirEvidenciaParaTerminar({ ...base, exigeArchivo: false })).not.toThrow();
    expect(() => exigirEvidenciaParaTerminar({ ...base, exigeArchivo: true })).toThrow(FaltaElEstadoDeCuenta);
    expect(() => exigirEvidenciaParaTerminar({ ...base, tieneArchivo: true, exigeArchivo: true })).not.toThrow();
  });

  it('autorizar no revisa el archivo (la variable se revisa solo al terminar)', () => {
    const quien = { usuarioId: 'otro', esSuperacceso: false };
    const buena = elaborada('10.00');
    expect(buena.instantanea().estadoDeCuentaArchivoId).toBeNull();
    buena.autorizar(quien, foto('10.00'));
    expect(buena.estaAutorizada).toBe(true);
  });
});

describe('el mensaje de saldo que no coincide', () => {
  it('escribe los montos con miles y espacio, como la pantalla', () => {
    const error = new SaldoDelEstadoDeCuentaNoCoincide('12270.01', '12270.00', '-0.01');
    expect(error.message).toContain('(Q 12,270.01)');
    expect(error.message).toContain('(Q 12,270.00)');
  });
});
