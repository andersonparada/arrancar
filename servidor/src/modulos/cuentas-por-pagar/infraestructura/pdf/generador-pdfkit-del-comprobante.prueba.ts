import { describe, expect, it } from 'vitest';
import { nombreDelPdfDelComprobante } from '../../aplicacion/puertos/generador-de-pdf-del-comprobante.js';
import { comprobanteDePrueba, documentoDelComprobante } from '../../pruebas/comprobante-de-prueba.js';
import { GeneradorPdfkitDelComprobante } from './generador-pdfkit-del-comprobante.js';

const textoDelPdf = (pdf: Buffer) => pdf.toString('latin1');
const paginasDe = (pdf: Buffer) => (textoDelPdf(pdf).match(/\/Type \/Page\b(?!s)/g) ?? []).length;
const generador = new GeneradorPdfkitDelComprobante();

describe('PDF del comprobante de pago con pdfkit', () => {
  it('sale un PDF con una página por hoja (original y copia)', async () => {
    const pdf = await generador.generar(comprobanteDePrueba());

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(paginasDe(pdf)).toBe(2);
    expect(pdf.length).toBeLessThan(500_000);
  });

  it('un pago anulado, posfechado y en efectivo también sale', async () => {
    const base = comprobanteDePrueba();
    const pdf = await generador.generar({
      ...base,
      esReciboDeEfectivo: true,
      pago: {
        ...base.pago,
        posfechado: true,
        estado: 'anulado',
        anulacion: { fecha: '2026-11-19', motivo: 'Error de captura' },
      },
      medio: null,
      retiro: { numero: 'RE-3', custodio: 'Ana Pérez' },
    });

    expect(paginasDe(pdf)).toBe(2);
  });

  it('un comprobante largo sigue en más páginas en vez de salirse de la hoja', async () => {
    const documentos = Array.from({ length: 60 }, (_, i) =>
      documentoDelComprobante({ documentoId: `d${i}`, numero: `${i}` }),
    );
    const base = comprobanteDePrueba();

    const pdf = await generador.generar({
      ...base,
      contrasenas: [{ id: 'c', numero: 'CT-1', pagado: '60000.00', documentos }],
    });

    expect(paginasDe(pdf)).toBeGreaterThan(4);
    expect(paginasDe(pdf) % 2).toBe(0);
  });

  it('no lleva enlaces, scripts ni archivos incrustados, aunque los textos los intenten', async () => {
    const base = comprobanteDePrueba();
    const pdf = textoDelPdf(
      await generador.generar({
        ...base,
        beneficiario: 'javascript:alert(1) http://127.0.0.1/x',
        pago: { ...base.pago, observaciones: '<script>alert(1)</script> /JS /URI' },
      }),
    );

    for (const peligro of [
      '/JS',
      '/JavaScript',
      '/URI',
      '/Launch',
      '/OpenAction',
      '/EmbeddedFile',
      '/AA',
      '/Encrypt',
    ]) {
      expect(pdf).not.toContain(peligro);
    }
  });

  it('textos de 20,000 caracteres, con controles, marcas de dirección y emoji, no tumban ni demoran', async () => {
    const hostil = `\u0000${'W'.repeat(20000)}‮😀日本`;
    const base = comprobanteDePrueba();
    const inicio = performance.now();

    const pdf = await generador.generar({
      ...base,
      proveedor: { ...base.proveedor, nombre: hostil },
      pago: { ...base.pago, observaciones: hostil, motivo: hostil },
    });

    expect(paginasDe(pdf)).toBe(2);
    expect(performance.now() - inicio).toBeLessThan(3000);
  });

  it('dos generaciones a la vez se atienden una tras otra y ambas terminan', async () => {
    const [uno, dos] = await Promise.all([
      generador.generar(comprobanteDePrueba()),
      generador.generar(comprobanteDePrueba()),
    ]);

    expect(paginasDe(uno)).toBe(2);
    expect(paginasDe(dos)).toBe(2);
  });
});

describe('nombre del PDF adjunto', () => {
  it('lleva el número del pago y solo caracteres seguros', () => {
    expect(nombreDelPdfDelComprobante('2026-15')).toBe('comprobante-de-pago-2026-15.pdf');
    expect(nombreDelPdfDelComprobante('../../etc/passwd')).toBe('comprobante-de-pago-etc-passwd.pdf');
    expect(nombreDelPdfDelComprobante('///')).toBe('comprobante-de-pago-sin-numero.pdf');
  });
});
