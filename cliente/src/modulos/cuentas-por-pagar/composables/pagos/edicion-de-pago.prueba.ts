import { describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo, edicionDeEjemplo } from './ejemplos-de-pago';
import {
  cargosIncluidos,
  contrasenasIniciales,
  diferenciaOfrecible,
  diferenciasMarcadas,
  fechaFijaDeApertura,
  lineasDelPago,
  proponerMontos,
  residuoDelCargo,
  retencionDelPago,
  solicitudDePago,
  totalDelPago,
} from './edicion-de-pago';

const a = cargoDeEjemplo('a');
const b = cargoDeEjemplo('b', { saldo: '250.50', propuesto: '250.50', contrasenaId: 'c2' });
const inicial = cargoDeEjemplo('i', { origen: 'saldo_inicial', saldo: '80.00' });

describe('residuo con lo comprometido', () => {
  it('se calcula sobre lo disponible, no sobre la deuda', () => {
    const cargo = cargoDeEjemplo('c', { saldo: '500.00', comprometido: '200.00', disponible: '300.00' });
    expect(residuoDelCargo(cargo, '299.99')).toBe(1);
    expect(residuoDelCargo(cargo, '300.00')).toBe(0);
  });
});

describe('montos propuestos', () => {
  it('propone todo el saldo de las contraseñas incluidas y no pisa lo escrito', () => {
    const montos = proponerMontos([a, b], ['c1'], {});
    expect(montos).toEqual({ a: '1000.00' });
    expect(proponerMontos([a, b], ['c1', 'c2'], { a: '300.00' })).toEqual({ a: '300.00', b: '250.50' });
  });

  it('al venir de una contraseña se abre solo esa; sin ella, todas las del proveedor', () => {
    const datos = datosDeEjemplo([a, b]);
    expect(contrasenasIniciales(datos, 'c2')).toEqual(['c2']);
    expect(contrasenasIniciales(datos, null)).toEqual(['c1', 'c2']);
    expect(contrasenasIniciales(datos, 'otra')).toEqual(['c1', 'c2']);
  });
});

describe('líneas y totales', () => {
  const datos = datosDeEjemplo([a, b, inicial]);

  it('solo cuentan los cargos con un monto mayor que cero de las contraseñas incluidas', () => {
    const edicion = edicionDeEjemplo({ contrasenasIncluidas: ['c1'], montos: { a: '100.25', b: '50', i: '' } });
    const lineas = lineasDelPago(edicion, datos);
    expect(lineas.map(({ cargo }) => cargo.id)).toEqual(['a']);
    expect(totalDelPago(lineas)).toBe(10025);
  });

  it('el monto cero o vacío significa no pagar ese documento', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '0', i: '0.00' } });
    expect(lineasDelPago(edicion, datos)).toEqual([]);
  });

  it('sumar otra contraseña suma sus documentos', () => {
    const edicion = edicionDeEjemplo({ contrasenasIncluidas: ['c1', 'c2'], montos: { a: '100.00', b: '250.50' } });
    expect(totalDelPago(lineasDelPago(edicion, datos))).toBe(35050);
  });

  it('la cuenta de apertura solo toma saldos iniciales', () => {
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', montos: { a: '10.00', i: '80.00' } });
    expect(cargosIncluidos(edicion, datos).map(({ id }) => id)).toEqual(['i']);
    expect(totalDelPago(lineasDelPago(edicion, datos))).toBe(8000);
  });

  it('la retención que se descontará es informativa y se suma aparte', () => {
    const conRetencion = cargoDeEjemplo('r', { retencionPorDescontar: '15.00' });
    const edicion = edicionDeEjemplo({ montos: { r: '100.00' } });
    expect(retencionDelPago(lineasDelPago(edicion, datosDeEjemplo([conRetencion])))).toBe(1500);
  });
});

describe('diferencia de centavos', () => {
  it('se ofrece si queda algo mayor que cero y hasta el tope del servidor', () => {
    expect(residuoDelCargo(a, '999.97')).toBe(3);
    expect(diferenciaOfrecible(a, '999.97', '0.05')).toBe(3);
    expect(diferenciaOfrecible(a, '999.95', '0.05')).toBe(5);
  });

  it('no se ofrece si queda más del tope, si se paga todo o si no se paga nada', () => {
    expect(diferenciaOfrecible(a, '999.94', '0.05')).toBeNull();
    expect(diferenciaOfrecible(a, '1000.00', '0.05')).toBeNull();
    expect(diferenciaOfrecible(a, '', '0.05')).toBeNull();
    expect(residuoDelCargo(a, '')).toBe(0);
  });

  it('solo se manda la marcada y vigente con los montos de ahora', () => {
    const datos = datosDeEjemplo([a], { topeDiferencia: '0.05' });
    const edicion = edicionDeEjemplo({ montos: { a: '999.97' }, diferencias: ['a', 'fantasma'] });
    expect(diferenciasMarcadas(edicion, datos)).toEqual([{ cargoId: 'a', monto: '0.03' }]);
    expect(diferenciasMarcadas({ ...edicion, montos: { a: '900.00' } }, datos)).toEqual([]);
  });

  it('la cuenta de apertura nunca lleva diferencias', () => {
    const datos = datosDeEjemplo([inicial]);
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', montos: { i: '79.99' }, diferencias: ['i'] });
    expect(diferenciasMarcadas(edicion, datos)).toEqual([]);
  });
});

describe('cuerpo de la solicitud', () => {
  const datos = datosDeEjemplo([a, b, inicial]);

  it('un cheque lleva la chequera, no negociable y las líneas sin la contraseña', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '100.00' }, referencia: '  Pago de octubre ', observaciones: '' });
    expect(solicitudDePago(edicion, datos)).toEqual({
      forma: 'cheque',
      proveedorId: 'p1',
      fecha: '2026-11-15',
      referencia: 'Pago de octubre',
      observaciones: null,
      aplicaciones: [{ cargoId: 'a', monto: '100.00' }],
      chequeraId: 'ch1',
      noNegociable: true,
    });
  });

  it('una nota de débito lleva la cuenta; una ligada, el movimiento', () => {
    const base = { montos: { a: '100.00' } };
    expect(solicitudDePago(edicionDeEjemplo({ ...base, forma: 'nota_de_debito', medio: 'cb1' }), datos)).toMatchObject({
      forma: 'nota_de_debito',
      cuentaBancariaId: 'cb1',
    });
    expect(
      solicitudDePago(edicionDeEjemplo({ ...base, forma: 'nota_ligada', movimientoId: 'n1' }), datos),
    ).toMatchObject({
      forma: 'nota_ligada',
      movimientoId: 'n1',
    });
  });

  it('no manda diferencias vacías (el servidor exige al menos una si vienen)', () => {
    const cuerpo = solicitudDePago(edicionDeEjemplo({ montos: { a: '100.00' } }), datos);
    expect('diferencias' in cuerpo).toBe(false);
  });

  it('manda las diferencias marcadas', () => {
    const edicion = edicionDeEjemplo({ montos: { a: '999.98' }, diferencias: ['a'] });
    expect(solicitudDePago(edicion, datos)).toMatchObject({ diferencias: [{ cargoId: 'a', monto: '0.02' }] });
  });

  it('la apertura lleva el motivo recortado, sin diferencias y, con la carga abierta, sin fecha', () => {
    const edicion = edicionDeEjemplo({
      forma: 'cuenta_de_apertura',
      montos: { i: '80.00' },
      motivo: '  Ya estaba pagado ',
    });
    const cuerpo = solicitudDePago(edicion, datos);
    expect(cuerpo).toMatchObject({ forma: 'cuenta_de_apertura', motivo: 'Ya estaba pagado' });
    expect('fecha' in cuerpo).toBe(false);
    expect(fechaFijaDeApertura(edicion, datos)).toBe('2026-01-01');
  });

  it('la apertura con la carga cerrada sí lleva la fecha elegida', () => {
    const cerrada = datosDeEjemplo([inicial], { cargaCerrada: true });
    const edicion = edicionDeEjemplo({ forma: 'cuenta_de_apertura', montos: { i: '80.00' }, motivo: 'x' });
    expect(fechaFijaDeApertura(edicion, cerrada)).toBeNull();
    expect(solicitudDePago(edicion, cerrada)).toMatchObject({ fecha: '2026-11-15' });
  });
});
