import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CuentaParaPagar } from '../../servicios/tipos-de-pagos';
import type { DocumentoPorPagar } from '../../servicios/tipos';
import {
  edicionDeReintegro,
  erroresDeReintegro,
  esDelMismoProveedor,
  opcionesDeCuenta,
  resumenDeAnularReintegro,
  resumenDeReintegro,
  solicitudDeReintegro,
  totalDelReintegro,
} from './reintegro';

const hoy = '2026-11-15';

beforeEach(() => setActivePinia(createPinia()));

function nota(id: string, saldo: string, proveedorId = 'p1'): DocumentoPorPagar {
  return {
    id,
    tipo: 'nota_de_credito',
    serie: 'A',
    numero: id,
    saldo,
    proveedorId,
    proveedorNombre: proveedorId === 'p1' ? 'Veterinaria Sol' : 'Otra',
  } as DocumentoPorPagar;
}

const cuenta = (id: string, nombre: string): CuentaParaPagar =>
  ({
    cuentaBancariaId: id,
    nombre,
    bancoNombre: null,
    numero: '1',
    saldoCentavos: 0,
    chequeras: [],
  }) as CuentaParaPagar;

describe('edición', () => {
  it('propone todo el saldo libre de cada nota, la fecha de hoy y el depósito', () => {
    const edicion = edicionDeReintegro([nota('1', '100.00'), nota('2', '25.50')], hoy);
    expect(edicion).toMatchObject({ abierta: true, forma: 'deposito', fecha: hoy, proveedorNombre: 'Veterinaria Sol' });
    expect(edicion.notas.map(({ monto }) => monto)).toEqual(['100.00', '25.50']);
    expect(totalDelReintegro(edicion.notas)).toBe(12550);
  });

  it('solo junta notas del mismo proveedor', () => {
    expect(esDelMismoProveedor([], nota('1', '1.00'))).toBe(true);
    expect(esDelMismoProveedor([nota('1', '1.00')], nota('2', '1.00'))).toBe(true);
    expect(esDelMismoProveedor([nota('1', '1.00')], nota('3', '1.00', 'p2'))).toBe(false);
  });
});

describe('errores antes de enviar', () => {
  const base = () => ({ ...edicionDeReintegro([nota('1', '100.00')], hoy), cuentaBancariaId: 'c1' });

  it('acepta un depósito completo', () => {
    expect(erroresDeReintegro(base(), hoy)).toEqual({});
  });

  it('el depósito pide la cuenta', () => {
    expect(erroresDeReintegro({ ...base(), cuentaBancariaId: '' }, hoy).cuentaBancariaId).toMatch(/cuenta/);
  });

  it('el efectivo pide la referencia del recibo', () => {
    const efectivo = { ...base(), forma: 'efectivo' as const };
    expect(erroresDeReintegro(efectivo, hoy).referencia).toMatch(/recibo de caja/);
    expect(erroresDeReintegro({ ...efectivo, referencia: 'RC-15' }, hoy)).toEqual({});
  });

  it('cada monto va de más de cero hasta el saldo libre, con la llave del servidor', () => {
    const edicion = base();
    edicion.notas[0]!.monto = '100.01';
    expect(erroresDeReintegro(edicion, hoy)['notas.0.monto']).toMatch(/solo tiene/);
    edicion.notas[0]!.monto = '0';
    expect(erroresDeReintegro(edicion, hoy)['notas.0.monto']).toMatch(/mayor que cero/);
  });

  it('la fecha no puede ser futura', () => {
    expect(erroresDeReintegro({ ...base(), fecha: '2026-11-16' }, hoy).fecha).toMatch(/futura/);
  });
});

describe('solicitud y resúmenes', () => {
  it('el efectivo no manda cuenta y la referencia vacía va nula', () => {
    const edicion = {
      ...edicionDeReintegro([nota('1', '10.00')], hoy),
      forma: 'efectivo' as const,
      cuentaBancariaId: 'c1',
    };
    expect(solicitudDeReintegro({ ...edicion, referencia: ' RC-1 ' })).toMatchObject({
      forma: 'efectivo',
      cuentaBancariaId: null,
      referencia: 'RC-1',
      notas: [{ notaId: '1', monto: '10.00' }],
    });
    expect(solicitudDeReintegro(edicion).referencia).toBeNull();
  });

  it('ordena las cuentas por nombre', () => {
    const opciones = opcionesDeCuenta([cuenta('b', 'Zeta'), cuenta('a', 'Alfa')]);
    expect(opciones.map(({ texto }) => texto)).toEqual(['Escoja la cuenta', 'Alfa', 'Zeta']);
  });

  it('dice qué va a pasar según la forma', () => {
    const edicion = { ...edicionDeReintegro([nota('1', '100.00')], hoy), cuentaBancariaId: 'a' };
    expect(resumenDeReintegro(edicion, [cuenta('a', 'Alfa')])).toMatch(/Q\s?100\.00.*cuenta Alfa.*Bancos/);
    expect(resumenDeReintegro({ ...edicion, forma: 'efectivo' }, [])).toMatch(/en efectivo.*ninguna cuenta/);
  });

  it('al anular un depósito avisa del inverso en Bancos', () => {
    expect(resumenDeAnularReintegro('deposito', '15', '100.00')).toMatch(/inverso/);
    expect(resumenDeAnularReintegro('efectivo', '15', '100.00')).not.toMatch(/Bancos/);
  });
});
