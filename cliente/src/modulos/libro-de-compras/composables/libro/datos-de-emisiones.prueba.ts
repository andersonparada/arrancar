import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { EmisionDelLibro } from '../../servicios/libro.api';
import {
  errorConAyuda,
  exigeMotivo,
  leerFolio,
  motivoLimpio,
  problemaDelMotivo,
  proximoFolio,
  rangoDeFolios,
  revisarCorreccion,
} from './datos-de-emisiones';

const emision = { id: 'e1' } as EmisionDelLibro;

describe('folios', () => {
  it('el próximo folio sigue al último', () => {
    expect(proximoFolio(0)).toBe(1);
    expect(proximoFolio(40)).toBe(41);
  });

  it('describe el rango con su cantidad de hojas', () => {
    expect(rangoDeFolios({ folioDesde: 12, folioHasta: 15 })).toBe('Folios 12 al 15 (4 hojas)');
    expect(rangoDeFolios({ folioDesde: 7, folioHasta: 7 })).toBe('Folio 7');
  });

  it('lee solo enteros sin signo', () => {
    expect(leerFolio('25')).toEqual({ folio: 25 });
    expect(leerFolio(0)).toEqual({ folio: 0 });
    expect(leerFolio(' 3 ')).toEqual({ folio: 3 });
    for (const malo of ['', '-1', '2.5', '1,000', 'abc', null, '123456789']) {
      expect(leerFolio(malo)).toHaveProperty('problema');
    }
  });
});

describe('motivo de la emisión', () => {
  it('se exige solo si el período ya tiene emisiones', () => {
    expect(exigeMotivo([])).toBe(false);
    expect(exigeMotivo([emision])).toBe(true);
  });

  it('limpia los espacios y vuelve nulo lo vacío', () => {
    expect(motivoLimpio('  corregí un NIT ')).toBe('corregí un NIT');
    expect(motivoLimpio('   ')).toBeNull();
  });

  it('señala el motivo faltante o demasiado largo', () => {
    expect(problemaDelMotivo('', true)).toBe('Escriba el motivo.');
    expect(problemaDelMotivo('', false)).toBeNull();
    expect(problemaDelMotivo('x'.repeat(301), false)).toContain('300');
    expect(problemaDelMotivo('ok', true)).toBeNull();
  });
});

describe('corrección del último folio', () => {
  it('acepta un folio y un motivo válidos', () => {
    expect(revisarCorreccion('120', ' vengo de hojas usadas ')).toEqual({
      folio: 120,
      motivo: 'vengo de hojas usadas',
    });
  });

  it('marca cada campo con su problema', () => {
    expect(revisarCorreccion('-5', '')).toEqual({
      errores: { ultimoFolio: expect.any(String), motivo: 'Escriba el motivo.' },
    });
    expect(revisarCorreccion('5', '')).toEqual({ errores: { motivo: 'Escriba el motivo.' } });
  });
});

describe('errores con ayuda', () => {
  const error = (codigo: string, mensaje = 'Mensaje del servidor') =>
    new ErrorApi(409, { codigo, mensaje, detalles: { campo: 'motivo' } });

  it('explica que sin cambios no se gastaron folios', () => {
    const nuevo = errorConAyuda(error('emision_sin_cambios')) as ErrorApi;
    expect(nuevo.message).toContain('no se gastaron folios');
    expect(nuevo.codigo).toBe('emision_sin_cambios');
  });

  it('conserva el mensaje del servidor al corregir el folio y dice cómo seguir', () => {
    const nuevo = errorConAyuda(error('folio_menor_que_lo_emitido', 'Ya se emitieron folios hasta el 40.')) as ErrorApi;
    expect(nuevo.message).toContain('hasta el 40');
    expect(nuevo.message).toContain('igual o mayor');
  });

  it('deja intactos los demás errores, como el del motivo obligatorio', () => {
    const original = error('motivo_de_emision_obligatorio');
    expect(errorConAyuda(original)).toBe(original);
    expect(errorConAyuda(new Error('x'))).toBeInstanceOf(Error);
  });
});
