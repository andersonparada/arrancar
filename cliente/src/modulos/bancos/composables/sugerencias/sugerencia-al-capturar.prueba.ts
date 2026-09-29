import { describe, expect, it } from 'vitest';
import type { OpcionSugerida, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';
import { datosParaSugerir, sugerenciaParaMostrar, type CamposParaSugerir } from './sugerencia-al-capturar';

const campos: CamposParaSugerir = {
  cuentaBancariaId: 'c1',
  fecha: '2026-09-01',
  monto: 150,
  beneficiario: ' Ferretería El Clavo ',
  referencia: '',
  observaciones: '',
};

const opcion = (conceptoId: string, confianza = 80): OpcionSugerida => ({
  conceptoId,
  conceptoNombre: conceptoId,
  confianza,
  porque: {
    base: 'mismo_beneficiario',
    casos: 4,
    ultimaFecha: '2026-08-12',
    montoMinimo: '100.00',
    montoMaximo: '200.00',
    beneficiarioParecido: null,
  },
});

const sugerencia = (sugerido: string | null, alternativas: string[] = []): SugerenciaDeMovimiento => ({
  sugerido: sugerido ? opcion(sugerido) : null,
  alternativas: alternativas.map((id) => opcion(id, 20)),
  casosComparados: 5,
});

const opciones = [
  { valor: null, texto: 'Elija un concepto' },
  { valor: 'a', texto: 'A' },
  { valor: 'b', texto: 'B' },
];

describe('datosParaSugerir', () => {
  it('manda lo escrito sin espacios sobrantes y omite lo vacío', () => {
    expect(datosParaSugerir(campos)).toEqual({
      cuentaBancariaId: 'c1',
      fecha: '2026-09-01',
      monto: '150',
      beneficiario: 'Ferretería El Clavo',
      referencia: undefined,
      observaciones: undefined,
    });
  });

  it('espera a tener la cuenta', () => {
    expect(datosParaSugerir({ ...campos, cuentaBancariaId: null })).toBeNull();
  });

  it('espera a que haya beneficiario o referencia', () => {
    expect(datosParaSugerir({ ...campos, beneficiario: '  ' })).toBeNull();
    expect(datosParaSugerir({ ...campos, beneficiario: '', referencia: 'Boleta 55' })).not.toBeNull();
  });
});

describe('sugerenciaParaMostrar', () => {
  it('no pisa un concepto ya elegido', () => {
    expect(sugerenciaParaMostrar(sugerencia('a'), opciones, 'b')).toBeNull();
  });

  it('muestra el sugerido y las alternativas que se pueden elegir', () => {
    const mostrada = sugerenciaParaMostrar(sugerencia('a', ['b', 'inactivo']), opciones, null);

    expect(mostrada?.sugerido?.conceptoId).toBe('a');
    expect(mostrada?.alternativas.map((o) => o.conceptoId)).toEqual(['b']);
  });

  it('descarta un sugerido que la pantalla no ofrece y deja las alternativas', () => {
    const mostrada = sugerenciaParaMostrar(sugerencia('inactivo', ['b']), opciones, null);

    expect(mostrada?.sugerido).toBeNull();
    expect(mostrada?.alternativas).toHaveLength(1);
  });

  it('no muestra nada si no queda nada útil o no hay respuesta', () => {
    expect(sugerenciaParaMostrar(sugerencia('inactivo'), opciones, null)).toBeNull();
    expect(sugerenciaParaMostrar(null, opciones, null)).toBeNull();
  });
});
