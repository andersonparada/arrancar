import { describe, expect, it } from 'vitest';
import { enlaceParaImprimir } from './enlace-de-impresion';

describe('enlaceParaImprimir', () => {
  it('lleva a la pantalla de impresión de ese cheque', () => {
    expect(enlaceParaImprimir('c1', true)).toEqual({
      texto: 'Imprimir el cheque',
      ruta: { name: 'bancos.cheques.imprimir', query: { ids: 'c1' } },
    });
  });

  it('sin permiso de imprimir no se ofrece', () => {
    expect(enlaceParaImprimir('c1', false)).toBeUndefined();
  });
});
