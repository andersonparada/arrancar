import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { ChequeCaduco } from '../../servicios/cheques-caducos.api';
import {
  avisoDeAnulacion,
  conCheque,
  motivoSugerido,
  problemasDelError,
  seleccionDeTodos,
  seleccionVigente,
  textoDeProblemas,
  totalDeLaSeleccion,
} from './seleccion-de-cheques-caducos';

const cheque = (chequeId: string, monto: string, numero = 1): ChequeCaduco => ({
  chequeId,
  movimientoId: `m-${chequeId}`,
  cuentaBancariaId: 'cb',
  cuentaBancariaNombre: 'Monetaria',
  serie: null,
  numero,
  fecha: '2026-01-10',
  diasDeAntiguedad: 262,
  beneficiario: 'Proveedor',
  monto,
  mesConciliado: false,
  origen: 'suelto',
});

const cheques = [cheque('a', '0.10', 1), cheque('b', '0.20', 2), cheque('c', '1250.50', 3)];

describe('selección de cheques caducos', () => {
  it('suma en centavos enteros: 0.10 + 0.20 es exactamente 0.30', () => {
    expect(totalDeLaSeleccion(cheques, ['a', 'b'])).toEqual({ cantidad: 2, monto: '0.30' });
    expect(totalDeLaSeleccion(cheques, [])).toEqual({ cantidad: 0, monto: '0.00' });
  });

  it('marca y desmarca uno sin repetirlo, y todo lo filtrado de una vez', () => {
    expect(conCheque(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(conCheque(['a', 'b'], 'a', true)).toEqual(['a', 'b']);
    expect(conCheque(['a', 'b'], 'a', false)).toEqual(['b']);
    expect(seleccionDeTodos(cheques, true)).toEqual(['a', 'b', 'c']);
    expect(seleccionDeTodos(cheques, false)).toEqual([]);
  });

  it('al recargar, olvida lo seleccionado que ya no está en la lista', () => {
    expect(seleccionVigente([cheques[0]!], ['a', 'b'])).toEqual(['a']);
  });

  it('sugiere el motivo con el plazo de la empresa', () => {
    expect(motivoSugerido(7)).toBe('Cheque caduco: más de 7 meses sin cobrar');
    expect(motivoSugerido(1)).toBe('Cheque caduco: más de 1 mes sin cobrar');
  });

  it('el aviso respeta el singular', () => {
    expect(avisoDeAnulacion(1)).toBe('1 cheque anulado con su nota de crédito inversa.');
    expect(avisoDeAnulacion(3)).toBe('3 cheques anulados con su nota de crédito inversa.');
  });

  it('lee los problemas por cheque solo del error de la anulación en lote', () => {
    const problemas = [{ chequeId: 'b', codigo: 'cheque_no_es_caduco', mensaje: 'Ya no es caduco.' }];
    const delLote = new ErrorApi(422, { codigo: 'anulacion_en_lote_con_problemas', mensaje: 'x', detalles: problemas });

    expect(problemasDelError(delLote)).toEqual(problemas);
    expect(problemasDelError(new ErrorApi(422, { codigo: 'otro', mensaje: 'x', detalles: problemas }))).toEqual([]);
    expect(problemasDelError(new Error('x'))).toEqual([]);
    expect(textoDeProblemas(cheques, problemas)).toEqual(['Cheque 2 (Monetaria): Ya no es caduco.']);
    expect(textoDeProblemas(cheques, [{ ...problemas[0]!, chequeId: 'z' }])).toEqual(['Un cheque: Ya no es caduco.']);
  });
});
