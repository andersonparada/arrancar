import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ChequeDeAperturaNoLigable } from './errores-de-cheque-de-apertura.js';
import { MovimientoAnulado, MovimientoYaRevertido } from './errores.js';
import { OrigenDelMovimientoNoCoincide } from './errores-de-origen.js';
import { Movimiento } from './movimiento.js';
import type { PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

const ORIGEN = { modulo: 'cuentas-por-pagar', documentoId: '00000000-0000-4000-8000-0000000000bb' };

const posfechado = (cambios: Partial<PropiedadesDeMovimiento> = {}): Movimiento =>
  Movimiento.reconstruir({
    id: Identificador.desde('00000000-0000-4000-8000-000000000010'),
    empresaId: Identificador.desde('00000000-0000-4000-8000-0000000000aa'),
    cuentaBancariaId: '00000000-0000-4000-8000-000000000001',
    tipo: 'cheque',
    fecha: '2026-02-10',
    monto: '100.00',
    saldoInicial: false,
    referencia: null,
    beneficiario: 'Proveedor Uno',
    observaciones: null,
    conceptoId: 'sin-clasificar',
    interesBruto: null,
    isrRetenido: null,
    anuladoEn: null,
    motivoDeAnulacion: null,
    transferenciaId: null,
    revertidoEn: null,
    motivoDeReversion: null,
    revierteAId: null,
    numero: null,
    anioDeNumero: 0,
    moduloDeOrigen: null,
    documentoDeOrigenId: null,
    parteDeApertura: 'cheque_posfechado',
    saldoInicialId: '00000000-0000-4000-8000-000000000020',
    paraAbonoEnCuenta: false,
    ...cambios,
  });

describe('ligar un posfechado de apertura', () => {
  it('pone el origen y el concepto sin tocar monto, fecha ni parte de apertura', () => {
    const cheque = posfechado();

    cheque.ligarChequeDeApertura(ORIGEN, 'pago-a-proveedores');

    expect(cheque.instantanea()).toMatchObject({
      moduloDeOrigen: ORIGEN.modulo,
      documentoDeOrigenId: ORIGEN.documentoId,
      conceptoId: 'pago-a-proveedores',
      monto: '100.00',
      fecha: '2026-02-10',
      parteDeApertura: 'cheque_posfechado',
    });
  });

  it.each([
    ['otra parte de apertura', { parteDeApertura: 'cheque_en_circulacion' as const }],
    ['un movimiento normal', { parteDeApertura: null, saldoInicialId: null }],
    ['uno con origen', { moduloDeOrigen: 'caja-chica', documentoDeOrigenId: 'x' }],
    ['uno anulado', { anuladoEn: new Date() }],
    ['uno revertido', { revertidoEn: new Date() }],
    ['una nota', { tipo: 'debito' as const }],
  ])('no liga %s', (_nombre, cambios) => {
    expect(() => posfechado(cambios).ligarChequeDeApertura(ORIGEN, 'x')).toThrow(ChequeDeAperturaNoLigable);
  });
});

describe('desligar un posfechado de apertura', () => {
  const ligado = () => posfechado({ moduloDeOrigen: ORIGEN.modulo, documentoDeOrigenId: ORIGEN.documentoId });

  it('quita el origen y deja el concepto que se le da', () => {
    const cheque = ligado();

    cheque.desligarChequeDeApertura(ORIGEN, 'sin-clasificar');

    expect(cheque.instantanea()).toMatchObject({
      moduloDeOrigen: null,
      documentoDeOrigenId: null,
      conceptoId: 'sin-clasificar',
      parteDeApertura: 'cheque_posfechado',
    });
  });

  it('no desliga el de otro documento, el de otro módulo ni uno suelto', () => {
    const otro = { ...ORIGEN, documentoId: '00000000-0000-4000-8000-0000000000cc' };
    const deOtroModulo = { ...ORIGEN, modulo: 'caja-chica' };

    expect(() => ligado().desligarChequeDeApertura(otro, 'x')).toThrow(OrigenDelMovimientoNoCoincide);
    expect(() => ligado().desligarChequeDeApertura(deOtroModulo, 'x')).toThrow(OrigenDelMovimientoNoCoincide);
    expect(() => posfechado().desligarChequeDeApertura(ORIGEN, 'x')).toThrow(OrigenDelMovimientoNoCoincide);
  });

  it('no desliga uno anulado ni revertido', () => {
    const base = { moduloDeOrigen: ORIGEN.modulo, documentoDeOrigenId: ORIGEN.documentoId };

    expect(() => posfechado({ ...base, anuladoEn: new Date() }).desligarChequeDeApertura(ORIGEN, 'x')).toThrow(
      MovimientoAnulado,
    );
    expect(() => posfechado({ ...base, revertidoEn: new Date() }).desligarChequeDeApertura(ORIGEN, 'x')).toThrow(
      MovimientoYaRevertido,
    );
  });
});
