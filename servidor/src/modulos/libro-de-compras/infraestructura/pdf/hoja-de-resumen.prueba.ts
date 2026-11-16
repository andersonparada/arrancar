import { describe, expect, it } from 'vitest';
import type { DatosDelPdfDelLibro } from '../../aplicacion/puertos/generador-de-pdf-del-libro.js';
import { bloqueDerecho } from './hoja-de-resumen.js';

describe('hoja de resumen del PDF', () => {
  it('el IVA sin crédito por motivo lleva el nombre legible, no la clave', () => {
    const datos = {
      leyenda: [],
      resumen: {
        porTipoDte: [],
        ivaSinCreditoPorMotivo: [
          { motivo: 'otra_causa_sin_credito', ivaSinCredito: 6000 },
          { motivo: 'nota_de_debito_tardia', ivaSinCredito: 2400 },
        ],
      },
    } as unknown as DatosDelPdfDelLibro;

    const etiquetas = bloqueDerecho(datos).map((l) => l.etiqueta);

    expect(etiquetas).toContain('No dio crédito por otra causa');
    expect(etiquetas).toContain('Nota de débito tardía');
    expect(etiquetas.join('|')).not.toMatch(/_/);
  });
});
