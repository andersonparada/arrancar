import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Cheque } from './cheque.js';
import { ChequeAnulado, ChequeNoEmitido, MotivoDeAnulacionInvalido } from './errores.js';
import { ChequeImpresoNoSeBlanquea, ChequeImpresoNoSeCorrige, ChequeNoEstaEmitido } from './errores-de-impresion.js';

const empresaId = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const chequeDisponible = () => Cheque.crear(empresaId, 'una-chequera', 7);

function chequeEmitido(): Cheque {
  const cheque = chequeDisponible();
  cheque.emitir('un-movimiento', false);
  return cheque;
}

describe('Cheque.blanquear', () => {
  it('un cheque emitido vuelve a disponible, sin movimiento, y conserva su número', () => {
    const cheque = chequeEmitido();

    cheque.blanquear();

    expect(cheque.estaDisponible).toBe(true);
    expect(cheque.instantanea()).toMatchObject({
      estado: 'disponible',
      movimientoId: null,
      noNegociable: true,
      numero: 7,
    });
  });

  it('después de blanquearlo se puede volver a emitir', () => {
    const cheque = chequeEmitido();
    cheque.blanquear();

    cheque.emitir('otro-movimiento', true);

    expect(cheque.instantanea()).toMatchObject({ estado: 'emitido', movimientoId: 'otro-movimiento' });
  });

  it('solo se blanquea uno emitido: ni disponible ni anulado', () => {
    const anulado = chequeEmitido();
    anulado.anular('Se perdió');

    expect(() => chequeDisponible().blanquear()).toThrow(ChequeNoEmitido);
    expect(() => anulado.blanquear()).toThrow(ChequeNoEmitido);
  });
});

describe('Cheque.anular', () => {
  it('conserva el número y el movimiento del que salió', () => {
    const cheque = chequeEmitido();

    cheque.anular('  Se perdió ');

    expect(cheque.instantanea()).toMatchObject({
      estado: 'anulado',
      motivoDeAnulacion: 'Se perdió',
      movimientoId: 'un-movimiento',
      numero: 7,
    });
  });

  it('exige un motivo y no se anula dos veces', () => {
    const cheque = chequeDisponible();

    expect(() => cheque.anular('  ')).toThrow(MotivoDeAnulacionInvalido);
    cheque.anular('Roto');
    expect(() => cheque.anular('Otra vez')).toThrow(ChequeAnulado);
  });
});

describe('Cheque.anular: causa de la anulación (P1)', () => {
  it('por omisión es manual y queda nula mientras no se anula', () => {
    const cheque = chequeEmitido();
    expect(cheque.instantanea().causaDeAnulacion).toBeNull();

    cheque.anular('Error de captura');

    expect(cheque.instantanea()).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'manual' });
  });

  it('la caducidad queda como causa del cheque', () => {
    const cheque = chequeEmitido();

    cheque.anular('Caducó a los 7 meses', 'caducidad');

    expect(cheque.instantanea()).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'caducidad' });
  });

  it('un cheque anulado no se vuelve a anular', () => {
    const cheque = chequeEmitido();
    cheque.anular('Uno', 'caducidad');

    expect(() => cheque.anular('Dos')).toThrow(ChequeAnulado);
  });
});

describe('Cheque: impresión', () => {
  it('la primera impresión se guarda y las siguientes no la cambian', () => {
    const cheque = chequeEmitido();
    expect(cheque.estaImpreso).toBe(false);

    cheque.marcarImpreso(new Date('2026-11-18T10:00:00Z'));
    cheque.marcarImpreso(new Date('2026-11-19T10:00:00Z'));

    expect(cheque.estaImpreso).toBe(true);
    expect(cheque.instantanea().impresoEn).toEqual(new Date('2026-11-18T10:00:00Z'));
  });

  it('un cheque impreso no se blanquea', () => {
    const cheque = chequeEmitido();
    cheque.marcarImpreso(new Date());

    expect(() => cheque.blanquear()).toThrow(ChequeImpresoNoSeBlanquea);
  });

  it('«no negociable» se corrige solo en un cheque emitido y sin imprimir', () => {
    const cheque = chequeEmitido();
    cheque.corregirNoNegociable(true);
    expect(cheque.instantanea().noNegociable).toBe(true);

    expect(() => chequeDisponible().corregirNoNegociable(true)).toThrow(ChequeNoEstaEmitido);
    cheque.marcarImpreso(new Date());
    expect(() => cheque.corregirNoNegociable(false)).toThrow(ChequeImpresoNoSeCorrige);
  });

  it('puede anularse como inutilizado o extraviado', () => {
    const inutilizado = chequeEmitido();
    inutilizado.anular('Se arrugó en la impresora', 'inutilizado');
    const extraviado = chequeEmitido();
    extraviado.anular('Se perdió', 'extraviado');

    expect(inutilizado.instantanea().causaDeAnulacion).toBe('inutilizado');
    expect(extraviado.instantanea().causaDeAnulacion).toBe('extraviado');
  });
});
