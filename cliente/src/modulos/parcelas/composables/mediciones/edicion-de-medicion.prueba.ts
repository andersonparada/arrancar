import { describe, expect, it } from 'vitest';
import type { Medicion } from '../../servicios/mediciones.api';
import type { AjustesDeSuperficie } from '../superficie/unidades-de-superficie';
import {
  datosDeMedicion,
  erroresDeMedicion,
  hoyEnIso,
  medicionNueva,
  medicionQueRige,
  mensajeDeAnulacion,
} from './edicion-de-medicion';

const AJUSTES: AjustesDeSuperficie = {
  factores: { metrosPorVara: 0.835905, varasCuadradasPorManzana: 10000, varasCuadradasPorCaballeria: 645816 },
  varasPorLadoDeCuerda: 25,
  unidadParaMostrar: 'manzana',
};

const medicion = (id: string, vigenteDesde: string, estado: Medicion['estado'] = 'vigente'): Medicion => ({
  id,
  parcelaId: 'p-1',
  vigenteDesde,
  fuente: 'escritura',
  superficieTotalM2: '6987.37',
  superficieUtilM2: '6987.37',
  cantidadOriginal: '1.0000',
  unidadOriginal: 'manzana',
  varasPorLadoDeCuerda: null,
  documento: null,
  estado,
  anuladaEn: null,
  motivoDeAnulacion: null,
});

describe('medición que se escribe', () => {
  it('empieza hoy, en la unidad de la empresa y con las varas de su cuerda', () => {
    const nueva = medicionNueva(AJUSTES);

    expect(nueva).toMatchObject({ abierta: true, unidad: 'manzana', varasPorLadoDeCuerda: 25, cifra: '' });
    expect(nueva.vigenteDesde).toBe(hoyEnIso());
  });

  it('manda las cifras como texto y lo vacío como null', () => {
    const edicion = { ...medicionNueva(AJUSTES), vigenteDesde: '2026-01-15', cifra: 2, cifraUtil: '1.5' };

    expect(datosDeMedicion(edicion)).toEqual({
      vigenteDesde: '2026-01-15',
      fuente: 'escritura',
      cantidadOriginal: '2',
      unidadOriginal: 'manzana',
      varasPorLadoDeCuerda: null,
      cantidadUtil: '1.5',
      documento: null,
    });
  });

  it('solo la cuerda manda sus varas por lado', () => {
    const cuerda = { ...medicionNueva(AJUSTES), cifra: '16', unidad: 'cuerda' as const, varasPorLadoDeCuerda: '40' };

    expect(datosDeMedicion(cuerda).varasPorLadoDeCuerda).toBe(40);
    expect(datosDeMedicion({ ...cuerda, unidad: 'hectarea' }).varasPorLadoDeCuerda).toBeNull();
  });

  it('la fecha de hoy es la del calendario del navegador, no la de UTC', () => {
    expect(hoyEnIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('errores del servidor en la medición', () => {
  it('se reparten con el nombre de los campos del formulario', () => {
    expect(
      erroresDeMedicion({
        'medicion.cantidadOriginal': 'Escriba la superficie.',
        cantidadUtil: 'La útil no puede pasar de la total.',
        'medicion.vigenteDesde': 'La fecha no puede ser futura.',
        nombre: 'Falta el nombre.',
      }),
    ).toEqual({
      cifra: 'Escriba la superficie.',
      cifraUtil: 'La útil no puede pasar de la total.',
      vigenteDesde: 'La fecha no puede ser futura.',
      nombre: 'Falta el nombre.',
    });
  });
});

describe('medición que rige', () => {
  const mediciones = [
    medicion('futura', '2027-01-01'),
    medicion('anulada', '2026-06-01', 'anulada'),
    medicion('actual', '2026-03-01'),
    medicion('vieja', '2025-01-01'),
  ];

  it('es la vigente más reciente que ya empezó, sin contar las anuladas', () => {
    expect(medicionQueRige(mediciones, '2026-11-23')?.id).toBe('actual');
    expect(medicionQueRige(mediciones, '2025-06-01')?.id).toBe('vieja');
  });

  it('antes de la primera no rige ninguna', () => {
    expect(medicionQueRige(mediciones, '2024-12-31')).toBeNull();
  });

  it('la confirmación de anular explica que no se borra', () => {
    expect(mensajeDeAnulacion('01/03/2026')).toContain('No se borra');
  });
});
