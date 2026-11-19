import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PagoRegistrado } from '../../servicios/tipos-de-pagos';
import {
  detallesDelPagoRegistrado,
  documentoDelPago,
  marcasDelPago,
  nombreDeLaForma,
  nombreDelEstadoDePago,
  textoDeExitoDelPago,
  tonoDelEstadoDePago,
} from './detalles-de-pago';

const pago = (cambios: Partial<PagoRegistrado> = {}): PagoRegistrado => ({
  id: 'p1',
  numero: '2026-7',
  contrasenas: [{ id: 'c1', numero: '2026-15' }],
  proveedor: { id: 'pr1', nombre: 'Agro S.A.', nit: '1234567-8' },
  beneficiario: 'Agropecuaria La Esperanza, S.A.',
  forma: 'cheque',
  fecha: '2026-11-15',
  posfechado: false,
  monto: '1500.00',
  movimiento: { id: 'm1', cuentaBancariaId: 'b1', numero: 1523 },
  estado: 'vigente',
  avisos: [],
  ...cambios,
});

beforeEach(() => setActivePinia(createPinia()));

describe('pago registrado', () => {
  it('muestra el documento bancario: cheque con su número, y solo la forma si no hay movimiento', () => {
    expect(documentoDelPago(pago())).toBe('Cheque 1523');
    expect(documentoDelPago(pago({ forma: 'cuenta_de_apertura', movimiento: null }))).toBe('Cuenta de apertura');
  });

  it('los detalles llevan el beneficiario y marcan el posfechado', () => {
    const detalles = detallesDelPagoRegistrado(pago({ posfechado: true }));
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Beneficiario')?.valor).toBe('Agropecuaria La Esperanza, S.A.');
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Fecha')?.valor).toMatch(/\(posfechado\)/);
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Monto')?.valor).toMatch(/1,500\.00/);
  });

  it('el aviso de éxito dice que el posfechado queda comprometido', () => {
    expect(textoDeExitoDelPago(pago())).toBe('Pago 2026-7 registrado.');
    expect(textoDeExitoDelPago(pago({ posfechado: true }))).toMatch(/comprometido/);
  });
});

describe('nombres', () => {
  it('formas y estados de pago en español de usted', () => {
    expect(nombreDeLaForma('nota_ligada')).toBe('Nota de débito ya registrada');
    expect(nombreDelEstadoDePago('en_parte')).toBe('Pagado en parte');
    expect(nombreDelEstadoDePago('comprometido')).toBe('Comprometido');
    expect(nombreDelEstadoDePago('comprometido_en_parte')).toBe('Comprometido en parte');
    expect(nombreDelEstadoDePago('pendiente')).toBe('Pendiente');
    expect(tonoDelEstadoDePago('comprometido_en_parte')).toBe('trigo');
    expect(tonoDelEstadoDePago('pagado')).toBe('campo');
  });

  it('las marcas de un pago de la contraseña', () => {
    expect(marcasDelPago({ estado: 'vigente', comprometido: true })).toEqual(['Posfechado']);
    expect(marcasDelPago({ estado: 'anulado', comprometido: false })).toEqual(['Anulado']);
    expect(marcasDelPago({ estado: 'vigente', comprometido: false })).toEqual([]);
  });
});
