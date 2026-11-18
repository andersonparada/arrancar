import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { retiroDeEjemplo } from './ejemplos-de-retiro.soporte';
import {
  conDevuelto,
  conFaltante,
  erroresDeLaLiquidacion,
  liquidacionDelRetiro,
  resumenDeLaLiquidacion,
  solicitudDeLiquidacion,
} from './liquidacion';

beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-15';
const abierta = () => liquidacionDelRetiro(retiroDeEjemplo(), HOY);

describe('al abrir la liquidación', () => {
  it('propone devolver todo lo que sobró, a la cuenta del retiro y con la fecha de hoy', () => {
    expect(abierta()).toMatchObject({
      abierta: true,
      sobrante: 180000,
      devuelto: '1800.00',
      faltante: '0.00',
      cuentaBancariaId: 'b1',
      fecha: HOY,
      numero: '2026-4',
      custodio: 'Juan Pérez',
    });
  });

  it('recuerda si quien liquida es el custodio', () => {
    expect(liquidacionDelRetiro(retiroDeEjemplo({ liquidaElCustodio: true }), HOY).liquidaElCustodio).toBe(true);
  });
});

describe('devuelto y faltante se completan entre sí', () => {
  it('al bajar lo devuelto, el resto pasa a faltante', () => {
    expect(conDevuelto(abierta(), '1500')).toMatchObject({ devuelto: '1500', faltante: '300.00' });
  });

  it('al escribir un faltante, el resto pasa a devuelto', () => {
    expect(conFaltante(abierta(), '50.25')).toMatchObject({ faltante: '50.25', devuelto: '1749.75' });
  });

  it('devolver más de lo que sobró deja el faltante en cero, sin números negativos', () => {
    expect(conDevuelto(abierta(), '2000').faltante).toBe('0.00');
  });
});

describe('errores antes de enviar', () => {
  it('la propuesta inicial no tiene errores', () => {
    expect(erroresDeLaLiquidacion(abierta(), HOY)).toEqual({});
  });

  it('lo devuelto y lo que falta deben sumar lo que sobró', () => {
    const errores = erroresDeLaLiquidacion({ ...abierta(), devuelto: '1000', faltante: '0.00' }, HOY);
    expect(errores.devuelto).toContain('Q\u00a01,800.00');
  });

  it('un faltante pide el motivo', () => {
    const edicion = conDevuelto(abierta(), '1500');
    expect(erroresDeLaLiquidacion(edicion, HOY).motivoDeFaltante).toContain('por qué falta');
    expect(erroresDeLaLiquidacion({ ...edicion, motivoDeFaltante: 'Se perdió un billete' }, HOY)).toEqual({});
  });

  it('un depósito pide la cuenta y la fecha no puede ser futura', () => {
    const errores = erroresDeLaLiquidacion({ ...abierta(), cuentaBancariaId: '', fecha: '2026-11-16' }, HOY);
    expect(errores.cuentaBancariaId).toContain('cuenta');
    expect(errores.fecha).toContain('futura');
  });

  it('sin depósito no hace falta la cuenta', () => {
    const todoFaltante = { ...conDevuelto(abierta(), '0'), cuentaBancariaId: '', motivoDeFaltante: 'Robo' };
    expect(erroresDeLaLiquidacion(todoFaltante, HOY)).toEqual({});
  });

  it('un monto mal escrito se dice en su campo', () => {
    const errores = erroresDeLaLiquidacion({ ...abierta(), devuelto: 'abc' }, HOY);
    expect(errores.devuelto).toContain('dos decimales');
  });
});

describe('el cuerpo para el servidor', () => {
  it('con depósito manda la cuenta y la boleta', () => {
    const edicion = { ...abierta(), referencia: ' 77 ' };
    expect(solicitudDeLiquidacion(edicion)).toEqual({
      fecha: HOY,
      devuelto: '1800.00',
      faltante: '0.00',
      motivoDeFaltante: null,
      cuentaBancariaId: 'b1',
      referencia: '77',
    });
  });

  it('con faltante manda el motivo; sin depósito no manda cuenta ni boleta', () => {
    const edicion = { ...conDevuelto(abierta(), '0'), motivoDeFaltante: ' Robo ', referencia: 'x' };
    const cuerpo = solicitudDeLiquidacion(edicion);
    expect(cuerpo).toMatchObject({ devuelto: '0.00', faltante: '1800.00', motivoDeFaltante: 'Robo', referencia: null });
    expect(cuerpo).not.toHaveProperty('cuentaBancariaId');
  });
});

describe('el resumen de lo que va a pasar', () => {
  it('nombra el depósito en Bancos y el faltante con su cuenta pendiente', () => {
    const edicion = conDevuelto(abierta(), '1500');
    const texto = resumenDeLaLiquidacion(edicion, 'Cuenta monetaria');
    expect(texto).toContain('depósito de Q\u00a01,500.00 en Cuenta monetaria');
    expect(texto).toContain('faltante de efectivo');
    expect(texto).toContain('Q\u00a0300.00');
  });

  it('si todo se usó, dice que no hay nada que devolver', () => {
    const retiro = retiroDeEjemplo({ pagado: '5000.00', disponible: '0.00' });
    const texto = resumenDeLaLiquidacion(liquidacionDelRetiro(retiro, HOY), 'Cuenta');
    expect(texto).toContain('nada que devolver');
  });
});
