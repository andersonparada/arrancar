import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { lineasDelPago } from './edicion-de-pago';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo, notaDeEjemplo } from './ejemplos-de-pago';
import { erroresDelPago, repartirErroresDelServidor } from './errores-del-pago';

const hoy = '2026-11-15';
const a = cargoDeEjemplo('a');
const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial', saldo: '80.00', fechaDeEmision: '2025-12-01' });

beforeEach(() => setActivePinia(createPinia()));

const errores = (cambios: Parameters<typeof edicionDeEjemplo>[0], extra: Parameters<typeof datosDeEjemplo>[1] = {}) =>
  erroresDelPago(edicionDeEjemplo(cambios), {
    datos: datosDeEjemplo([a, inicial], extra),
    notas: [notaDeEjemplo()],
    hoy,
  });

describe('errores antes de enviar', () => {
  it('un pago correcto no tiene errores', () => {
    expect(errores({ montos: { a: '100.00' } })).toEqual({});
  });

  it('sin proveedor pide escogerlo', () => {
    expect(errores({ proveedorId: '' }).proveedorId).toMatch(/Escoja el proveedor/);
  });

  it('sin ningún monto dice cómo corregirlo', () => {
    expect(errores({ montos: { a: '' } }).aplicaciones).toMatch(/monto de al menos un documento/);
  });

  it('un monto con más de dos decimales o texto da error en su documento', () => {
    expect(errores({ montos: { a: '10.555' } })['monto.a']).toMatch(/hasta dos decimales/);
    expect(errores({ montos: { a: 'abc' } })['monto.a']).toMatch(/hasta dos decimales/);
  });

  it('un monto mayor que el saldo dice cuánto se debe', () => {
    expect(errores({ montos: { a: '1000.01' } })['monto.a']).toMatch(/solo debe .*1,000\.00/);
  });

  it('el cheque pide chequera y la nota de débito pide cuenta', () => {
    expect(errores({ montos: { a: '10' }, medio: '' }).medio).toMatch(/chequera/);
    expect(errores({ montos: { a: '10' }, medio: '', forma: 'nota_de_debito' }).medio).toMatch(/cuenta bancaria/);
  });

  it('una nota ligada pide escoger la nota y no deja pasarse de lo que le queda', () => {
    expect(errores({ montos: { a: '10' }, forma: 'nota_ligada' }).movimientoId).toMatch(/Escoja la nota/);
    const pasada = errores({ montos: { a: '600.00' }, forma: 'nota_ligada', movimientoId: 'n1' });
    expect(pasada.movimientoId).toMatch(/solo le quedan .*500\.00/);
  });

  it('sin nombre del NIT no se emite cheque ni nota de débito, pero sí se liga una nota', () => {
    const sin = { beneficiario: null };
    expect(errores({ montos: { a: '10' } }, sin).proveedorId).toMatch(/razón social.*Terceros/);
    expect(errores({ montos: { a: '10' }, forma: 'nota_de_debito' }, sin).proveedorId).toBeTruthy();
    expect(errores({ montos: { a: '10' }, forma: 'nota_ligada', movimientoId: 'n1' }, sin).proveedorId).toBeUndefined();
  });

  it('la apertura pide el motivo y limita su largo', () => {
    const base = { forma: 'cuenta_de_apertura' as const, montos: { i: '80.00' } };
    expect(errores(base).motivo).toMatch(/Cuente por qué/);
    expect(errores({ ...base, motivo: 'x'.repeat(301) }).motivo).toMatch(/300/);
    expect(errores({ ...base, motivo: 'Pagado en enero' })).toEqual({});
  });

  it('la referencia larga da error', () => {
    expect(errores({ montos: { a: '10' }, referencia: 'x'.repeat(101) }).referencia).toBeTruthy();
  });

  it('la fecha anterior a la emisión da error en la fecha', () => {
    expect(errores({ montos: { a: '10' }, fecha: '2026-09-01' }).fecha).toMatch(/anterior al/);
  });
});

describe('errores del servidor', () => {
  const datos = datosDeEjemplo([a, cargoDeEjemplo('b')]);
  const edicion = edicionDeEjemplo({ montos: { a: '10', b: '20' } });
  const lineas = lineasDelPago(edicion, datos);

  it('el monto o el documento de la línea N vuelve a su cargo', () => {
    const repartidos = repartirErroresDelServidor(
      {
        'aplicaciones.1.monto': 'El documento B-b solo debe Q5.00.',
        'aplicaciones.0.cargoId': 'No está en una contraseña vigente.',
      },
      lineas,
    );
    expect(repartidos).toEqual({
      'monto.b': 'El documento B-b solo debe Q5.00.',
      'monto.a': 'No está en una contraseña vigente.',
    });
  });

  it('la chequera y la cuenta vuelven al medio, las diferencias a su campo y lo demás pasa igual', () => {
    expect(
      repartirErroresDelServidor(
        { chequeraId: 'Escoja la chequera.', 'diferencias.0.cargoId': 'x', fecha: 'y' },
        lineas,
      ),
    ).toEqual({ medio: 'Escoja la chequera.', diferencias: 'x', fecha: 'y' });
    expect(repartirErroresDelServidor({ cuentaBancariaId: 'Escoja la cuenta.' }, lineas)).toEqual({
      medio: 'Escoja la cuenta.',
    });
  });
});
