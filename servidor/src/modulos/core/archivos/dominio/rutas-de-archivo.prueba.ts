import { describe, expect, it } from 'vitest';
import { RutasDeArchivo } from './rutas-de-archivo.js';

const empresa = crypto.randomUUID();
const fecha = new Date('2026-11-13T12:00:00Z');

describe('RutasDeArchivo.esGenerada', () => {
  it('reconoce todo lo que generan deImagen y deDocumento', () => {
    const imagen = RutasDeArchivo.deImagen(empresa, fecha, crypto.randomUUID());
    const pdf = RutasDeArchivo.deDocumento(empresa, fecha, `${crypto.randomUUID()}.pdf`);
    const foto = RutasDeArchivo.deDocumento(empresa, fecha, `${crypto.randomUUID()}.webp`);

    for (const ruta of [imagen.original, imagen.miniatura!, pdf.original, foto.original])
      expect(RutasDeArchivo.esGenerada(ruta)).toBe(true);
  });

  it.each([
    'instalacion/logo.png',
    'suelto.pdf',
    '../etc/passwd',
    `${crypto.randomUUID()}/2026/11/notas.txt`,
    `${crypto.randomUUID()}/2026/11/${crypto.randomUUID()}.exe`,
    `x/${crypto.randomUUID()}/2026/11/${crypto.randomUUID()}.pdf`,
  ])('no reconoce %s', (ruta) => {
    expect(RutasDeArchivo.esGenerada(ruta)).toBe(false);
  });
});
