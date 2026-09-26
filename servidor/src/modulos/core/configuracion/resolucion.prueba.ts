import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../modulos-sistema/definicion-modulo.js';
import { resolverValor } from './resolucion.js';

const diasAviso = definirConfiguracion({
  clave: 'prueba.avisos.dias',
  descripcion: '',
  esquema: z.number().int().min(1),
  predeterminado: 30,
  niveles: ['instalacion', 'cuenta', 'empresa'],
}) as DefinicionConfiguracion<number>;

describe('resolverValor', () => {
  it('usa el predeterminado si ningún nivel fijó valor', () => {
    expect(resolverValor(diasAviso, {})).toEqual({ valor: 30, origen: 'predeterminado' });
  });

  it('gana el nivel más específico: empresa sobre cuenta sobre instalación', () => {
    expect(resolverValor(diasAviso, { instalacion: 10, cuenta: 20, empresa: 5 })).toEqual({ valor: 5, origen: 'empresa' });
    expect(resolverValor(diasAviso, { instalacion: 10, cuenta: 20 })).toEqual({ valor: 20, origen: 'cuenta' });
    expect(resolverValor(diasAviso, { instalacion: 10 })).toEqual({ valor: 10, origen: 'instalacion' });
  });

  it('ignora un valor guardado que ya no cumple el esquema', () => {
    expect(resolverValor(diasAviso, { empresa: -3, cuenta: 20 })).toEqual({ valor: 20, origen: 'cuenta' });
  });

  it('ignora niveles que la variable no admite', () => {
    const soloInstalacion = { ...diasAviso, niveles: ['instalacion'] as const };
    expect(resolverValor(soloInstalacion, { empresa: 5, instalacion: 12 })).toEqual({ valor: 12, origen: 'instalacion' });
  });
});
