import { describe, expect, it } from 'vitest';
import type { DatosDelPdfDelLibro } from '../../aplicacion/puertos/generador-de-pdf-del-libro.js';
import { COLUMNAS_DE_DINERO, type FilaDelLibro } from '../../dominio/libro/fila-del-libro.js';
import { LEYENDA_DE_MOTIVOS } from '../../dominio/libro/motivos-del-libro.js';
import { paginarLibro } from '../../dominio/libro/paginacion-del-libro.js';
import { resumenDelLibro } from '../../dominio/libro/resumen-del-libro.js';
import { GeneradorPdfkitDelLibro } from './generador-pdfkit-del-libro.js';

function fila(numero: number, nombre: string): FilaDelLibro {
  const montos = Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0]));
  return {
    ...montos,
    documentoId: `d${numero}`,
    proveedorId: 'p',
    numeroDeFila: numero,
    fecha: '2026-10-01',
    tipoDte: 'FACT',
    serie: 'A',
    numero: String(numero),
    nit: '1234567',
    nombre,
    motivo: null,
    siglaDelMotivo: null,
    bienes: 100000,
    ivaConCredito: 12000,
    total: 112000,
  } as FilaDelLibro;
}

function datos(filas: FilaDelLibro[], primerFolio: number | null = 1): DatosDelPdfDelLibro {
  return {
    empresa: { nombre: 'Rancho Ñandú, S. A.', nit: '1234567' },
    periodo: '2026-10-01',
    tipoDeLibro: 'completo',
    libro: paginarLibro(filas),
    resumen: resumenDelLibro(filas),
    leyenda: LEYENDA_DE_MOTIVOS,
    primerFolio,
  };
}

const textoDelPdf = (pdf: Buffer) => pdf.toString('latin1');
const paginasDe = (pdf: Buffer) => (textoDelPdf(pdf).match(/\/Type \/Page\b(?!s)/g) ?? []).length;
const generador = new GeneradorPdfkitDelLibro();

describe('PDF del libro con pdfkit', () => {
  it('dibuja una hoja por página del dominio más la del resumen', async () => {
    const filas = Array.from({ length: 70 }, (_, i) => fila(i + 1, 'Proveedor Peña'));

    const pdf = await generador.generar(datos(filas));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(paginasDe(pdf)).toBe(paginarLibro(filas).hojas);
  });

  it('un libro sin filas también sale', async () => {
    expect(paginasDe(await generador.generar(datos([])))).toBe(2);
  });

  it('no lleva enlaces, scripts ni archivos incrustados', async () => {
    const pdf = textoDelPdf(await generador.generar(datos([fila(1, 'javascript:alert(1) http://127.0.0.1/x')])));

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

  it('un nombre de 20,000 caracteres sin espacios, con controles y emoji, no tumba ni demora', async () => {
    const hostil = `\u0000${'W'.repeat(20000)}‮😀日本`;
    const inicio = performance.now();

    const pdf = await generador.generar(datos([fila(1, hostil), fila(2, '=cmd|x'), fila(3, '<script>{{a}}%s')]));

    expect(paginasDe(pdf)).toBe(2);
    expect(performance.now() - inicio).toBeLessThan(2000);
  });

  it('5,000 filas salen en pocos segundos', async () => {
    const filas = Array.from({ length: 5000 }, (_, i) => fila(i + 1, `Proveedor número ${i + 1}, S. A.`));
    const inicio = performance.now();

    const pdf = await generador.generar(datos(filas));

    expect(paginasDe(pdf)).toBe(Math.ceil(5000 / 32) + 1);
    expect(performance.now() - inicio).toBeLessThan(8000);
  }, 20000);

  it('dos generaciones a la vez se atienden una tras otra y ambas terminan', async () => {
    const [uno, dos] = await Promise.all([generador.generar(datos([fila(1, 'A')])), generador.generar(datos([]))]);

    expect(paginasDe(uno)).toBe(2);
    expect(paginasDe(dos)).toBe(2);
  });
});
