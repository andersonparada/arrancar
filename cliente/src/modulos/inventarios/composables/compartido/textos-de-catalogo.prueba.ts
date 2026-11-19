import { describe, expect, it } from 'vitest';
import { textosDeCatalogo } from './textos-de-catalogo';

const unidad = textosDeCatalogo({
  nombre: 'unidad de medida',
  femenino: true,
  alInactivar: 'Dejará de ofrecerse.',
  sePuedeEliminar: 'si ningún artículo la usa',
});
const articulo = textosDeCatalogo({
  nombre: 'artículo',
  femenino: false,
  alInactivar: 'Dejará de ofrecerse.',
  sePuedeEliminar: 'si no tiene movimientos',
});

describe('textos de los catálogos', () => {
  it('concuerdan en género con el catálogo', () => {
    expect(unidad.inactivado).toBe('Unidad de medida inactivada.');
    expect(articulo.reactivado).toBe('Artículo reactivado.');
    expect(unidad.eliminado).toBe('Unidad de medida eliminada.');
    expect(articulo.eliminado).toBe('Artículo eliminado.');
  });

  it('la pregunta de estado cambia según esté activo o no', () => {
    expect(unidad.preguntaDeEstado(true, 'Libra')).toBe('¿Inactivar la unidad de medida «Libra»? Dejará de ofrecerse.');
    expect(articulo.preguntaDeEstado(false, 'Concentrado')).toBe(
      '¿Reactivar el artículo «Concentrado»? Volverá a ofrecerse.',
    );
  });

  it('la pregunta de eliminar dice cuándo se puede y manda a inactivar si ya se usó', () => {
    expect(unidad.preguntaDeEliminar('Libra')).toContain('si ningún artículo la usa');
    expect(unidad.preguntaDeEliminar('Libra')).toContain('inactívela');
    expect(articulo.preguntaDeEliminar('Concentrado')).toContain('inactívelo');
    expect(articulo.preguntaDeEliminar('Concentrado')).toContain('auditoría');
  });
});
