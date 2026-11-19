import { describe, expect, it } from 'vitest';
import { plantillasDeEjemplo } from '../formatos-de-cheque/ejemplos-de-formato';
import {
  formatoDeChequeraDeValor,
  opcionesDeFormatoDeChequera,
  textoDelFormatoDeChequera,
  valorDelFormatoDeChequera,
} from './formato-de-chequera';

const formato = (id: string, nombre: string, activo = true) => ({
  id,
  nombre,
  base: 'cheque_suelto' as const,
  ajustes: {},
  probadoEn: null,
  activo,
  chequerasQueLoUsan: 0,
});

describe('valor y formato de la chequera', () => {
  it('un formato propio va por su id y una plantilla por su clave', () => {
    expect(valorDelFormatoDeChequera({ formatoDeChequeId: 'f1', plantillaDeCheque: null })).toBe('formato:f1');
    expect(valorDelFormatoDeChequera({ formatoDeChequeId: null, plantillaDeCheque: 'cheque_suelto' })).toBe(
      'plantilla:cheque_suelto',
    );
    expect(valorDelFormatoDeChequera({ formatoDeChequeId: null, plantillaDeCheque: null })).toBe('');
  });

  it('al guardar manda una cosa o la otra, nunca las dos', () => {
    expect(formatoDeChequeraDeValor('formato:f1')).toEqual({ formatoDeChequeId: 'f1', plantillaDeCheque: null });
    expect(formatoDeChequeraDeValor('plantilla:cheque_suelto_casillas')).toEqual({
      formatoDeChequeId: null,
      plantillaDeCheque: 'cheque_suelto_casillas',
    });
    expect(formatoDeChequeraDeValor('')).toEqual({ formatoDeChequeId: null, plantillaDeCheque: null });
  });

  it('una plantilla que no existe se trata como sin formato', () => {
    expect(formatoDeChequeraDeValor('plantilla:inventada')).toEqual({
      formatoDeChequeId: null,
      plantillaDeCheque: null,
    });
  });
});

describe('opcionesDeFormatoDeChequera', () => {
  const formatos = [formato('b', 'Banrural'), formato('a', 'agromercado'), formato('c', 'Viejo', false)];

  it('empieza con «sin formato», sigue con los formatos por nombre y termina con las plantillas', () => {
    const opciones = opcionesDeFormatoDeChequera(formatos, plantillasDeEjemplo(), '');
    expect(opciones.map((o) => o.texto)).toEqual([
      'Sin formato (no se podrán imprimir sus cheques)',
      'agromercado',
      'Banrural',
      'Cheque suelto',
      'Voucher en carta',
    ]);
  });

  it('un formato inactivo solo aparece si la chequera ya lo usa, marcado como inactivo', () => {
    const opciones = opcionesDeFormatoDeChequera(formatos, [], 'formato:c');
    expect(opciones.map((o) => o.texto)).toContain('Viejo (inactivo)');
  });
});

describe('textoDelFormatoDeChequera', () => {
  it('dice el formato, la plantilla de fábrica o que no tiene', () => {
    expect(textoDelFormatoDeChequera({ formatoNombre: 'Banrural', plantillaDeCheque: null })).toBe('Banrural');
    expect(
      textoDelFormatoDeChequera({ formatoNombre: null, plantillaDeCheque: 'cheque_suelto' }, plantillasDeEjemplo()),
    ).toBe('Cheque suelto (de fábrica)');
    expect(textoDelFormatoDeChequera({ formatoNombre: null, plantillaDeCheque: null })).toBe('Sin formato');
    expect(textoDelFormatoDeChequera({ formatoNombre: null, plantillaDeCheque: 'cheque_suelto_casillas' })).toBe(
      'cheque suelto casillas (de fábrica)',
    );
  });
});
