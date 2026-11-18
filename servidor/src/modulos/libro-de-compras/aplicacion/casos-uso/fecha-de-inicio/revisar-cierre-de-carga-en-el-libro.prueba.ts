import { describe, expect, it } from 'vitest';
import { RevisarCierreDeCargaEnElLibro } from './revisar-cierre-de-carga-en-el-libro.js';

const revisar = (fechaDeInicio: string) => new RevisarCierreDeCargaEnElLibro().ejecutar({ fechaDeInicio });

describe('revisión del Libro de compras al cerrar la carga inicial', () => {
  it('con día 1 no tiene nada que decir', () => {
    expect(revisar('2026-03-01')).toBeNull();
  });

  it('el 1 de enero tampoco', () => {
    expect(revisar('2026-01-01')).toBeNull();
  });

  it('el 15 de marzo el mes queda partido y las compras del 1 al 14 no están en el libro', () => {
    expect(revisar('2026-03-15')).toEqual({
      nombreDelModulo: 'Libro de compras',
      resumen: null,
      ruta: null,
      hallazgos: [
        {
          codigo: 'mes_partido',
          nivel: 'aviso',
          mensaje:
            'El mes de 03/2026 queda partido: las compras del 1 al 14 no están en el Libro de compras de Arrancar; ' +
            'la declaración de ese mes debe sumarlas.',
          registro: null,
        },
      ],
      cifras: [],
    });
  });

  it('el día 2 el tramo anterior es solo el día 1', () => {
    expect(revisar('2026-03-02')?.hallazgos[0]?.mensaje).toContain('compras del 1 al 1 no');
  });
});
