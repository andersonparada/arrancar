import { describe, expect, it } from 'vitest';
import { FacturasAnterioresPosterioresALaFecha, NotasRecibidasAntesDeLaFecha } from './errores-de-factura-anterior.js';

const nota = { id: '1', serie: 'N', numero: '1' };

describe('mensajes al cambiar la fecha de inicio', () => {
  it('con una sola nota hablan en singular', () => {
    const error = new FacturasAnterioresPosterioresALaFecha('2026-09-15', { cantidad: 1, muestra: [nota] });
    expect(error.message).toBe(
      'Hay 1 nota sobre facturas del sistema anterior con fecha del 15/09/2026 o posterior: anúlela o elimínela antes de mover la fecha de inicio a esa fecha o antes.',
    );
    const recibida = new NotasRecibidasAntesDeLaFecha('2026-11-13', { cantidad: 1, muestra: [nota] });
    expect(recibida.message).toContain('Hay 1 nota sobre');
    expect(recibida.message).toContain('anúlela o elimínela');
  });

  it('con varias hablan en plural', () => {
    const error = new NotasRecibidasAntesDeLaFecha('2026-11-13', { cantidad: 3, muestra: [nota, nota, nota] });
    expect(error.message).toContain('Hay 3 notas sobre');
    expect(error.message).toContain('anúlelas o elimínelas');
  });
});
