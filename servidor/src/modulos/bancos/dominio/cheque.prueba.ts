import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Cheque } from './cheque.js';
import { ChequeAnulado, ChequeNoEmitido, MotivoDeAnulacionInvalido } from './errores.js';

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
