import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { InicioInvalido, MascaraInvalida } from './errores.js';
import { InicioContable, type DatosDeInicio } from './inicio.js';

const empresa = Identificador.nuevo<'Empresa'>();

const datos = (cambios: Partial<DatosDeInicio> = {}): DatosDeInicio => ({
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99.999',
  plantilla: null,
  firmaRepresentante: null,
  firmaContador: null,
  registroDelContador: null,
  ...cambios,
});

describe('InicioContable', () => {
  it('guarda la fecha, el caso y la máscara', () => {
    const inicio = InicioContable.crear(empresa, datos());

    expect(inicio.fecha).toBe('2026-01-01');
    expect(inicio.mascara.niveles).toBe(5);
  });

  it('rechaza una máscara mal escrita', () => {
    expect(() => InicioContable.crear(empresa, datos({ mascara: '9.9' }))).toThrow(MascaraInvalida);
  });

  it('rechaza una fecha mal escrita', () => {
    expect(() => InicioContable.crear(empresa, datos({ fecha: '1/1/2026' }))).toThrow(InicioInvalido);
  });

  it('recorta los firmantes y deja en blanco los vacíos', () => {
    const inicio = InicioContable.crear(
      empresa,
      datos({ firmaRepresentante: '  Ana Pérez ', firmaContador: ' Luis Gómez', registroDelContador: ' 1234 ' }),
    );

    expect(inicio.instantanea()).toMatchObject({
      firmaRepresentante: 'Ana Pérez',
      firmaContador: 'Luis Gómez',
      registroDelContador: '1234',
    });
    expect(
      InicioContable.crear(empresa, datos({ firmaRepresentante: '   ' })).instantanea().firmaRepresentante,
    ).toBeNull();
  });

  it('el contador va con su registro, o ninguno de los dos', () => {
    expect(() => InicioContable.crear(empresa, datos({ firmaContador: 'Luis Gómez' }))).toThrow(InicioInvalido);
    expect(() => InicioContable.crear(empresa, datos({ registroDelContador: '1234' }))).toThrow(InicioInvalido);
  });

  it('respeta los largos máximos', () => {
    expect(() => InicioContable.crear(empresa, datos({ firmaRepresentante: 'x'.repeat(151) }))).toThrow(InicioInvalido);
  });

  it('cambia sus datos', () => {
    const inicio = InicioContable.crear(empresa, datos());

    inicio.cambiarDatos(datos({ fecha: '2026-02-01', caso: 'posterior' }));

    expect(inicio.instantanea()).toMatchObject({ fecha: '2026-02-01', caso: 'posterior' });
  });
});
