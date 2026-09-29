import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { DatosFiscales } from './datos-fiscales.js';
import type { EmpresaId } from './empresa.js';
import { NombreComercialInvalido, RazonSocialInvalida } from './errores.js';

const empresaId: EmpresaId = Identificador.nuevo();

describe('datos fiscales', () => {
  it('recorta los espacios y deja en blanco lo que no se escribió', () => {
    const datos = DatosFiscales.crear(empresaId, { razonSocial: '  Ganadera Quiroa, S. A.  ', nombreComercial: '   ' });

    expect(datos.instantanea()).toEqual({
      empresaId,
      razonSocial: 'Ganadera Quiroa, S. A.',
      nombreComercial: null,
    });
  });

  it('acepta textos de hasta 200 caracteres', () => {
    expect(() => DatosFiscales.crear(empresaId, { razonSocial: 'x'.repeat(200), nombreComercial: null })).not.toThrow();
  });

  it('rechaza una razón social o un nombre comercial de más de 200 caracteres', () => {
    const largo = 'x'.repeat(201);

    expect(() => DatosFiscales.crear(empresaId, { razonSocial: largo, nombreComercial: null })).toThrow(
      RazonSocialInvalida,
    );
    expect(() => DatosFiscales.crear(empresaId, { razonSocial: null, nombreComercial: largo })).toThrow(
      NombreComercialInvalido,
    );
  });
});
