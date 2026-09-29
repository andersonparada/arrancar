import { describe, expect, it } from 'vitest';
import type { Localidad } from '../../servicios/localidades.api';
import { detallesDeLocalidad, llaveDeMunicipio } from './detalles-de-localidad';

const localidad = {
  departamentoCodigo: '01',
  municipioCodigo: '0101',
} as Localidad;
const nombres = {
  departamentos: { '01': 'Guatemala' },
  municipios: { [llaveDeMunicipio('01', '0101')]: 'Guatemala' },
};
const valorDe = (etiqueta: string, n?: typeof nombres) =>
  detallesDeLocalidad(localidad, n).find((d) => d.etiqueta === etiqueta)?.valor;

describe('detalles de la localidad', () => {
  it('muestra el nombre del departamento y del municipio', () => {
    expect(valorDe('Departamento', nombres)).toBe('Guatemala');
    expect(valorDe('Municipio', nombres)).toBe('Guatemala');
  });

  it('mientras no se conocen los nombres muestra el código', () => {
    expect(valorDe('Departamento')).toBe('01');
    expect(valorDe('Municipio')).toBe('0101');
  });
});
