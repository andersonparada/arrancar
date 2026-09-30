import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  DocumentoNoAceptado,
  PdfConContenidoActivo,
  PdfConContrasena,
  PdfConDemasiadasPaginas,
  PdfDanado,
  PdfNoSePudoRevisar,
} from '../../dominio/documento.js';
import { objetoDePdf, pdfDePrueba } from '../../pruebas/pdfs-de-prueba.js';
import { hayQpdf, RUTA_QPDF_DE_PRUEBA, transformarConQpdf } from '../../pruebas/soporte-de-qpdf.js';
import { EjecutorDeQpdf, LIMITES_DE_QPDF } from './ejecutor-de-qpdf.js';
import { InspectorQpdf } from './inspector-qpdf.js';

const inspector = new InspectorQpdf(new EjecutorDeQpdf(RUTA_QPDF_DE_PRUEBA));
const cuando = it.skipIf(!hayQpdf);

async function hallazgosDe(pdf: Buffer): Promise<string[]> {
  const error = await inspector.inspeccionar(pdf).then(
    () => null,
    (falla: unknown) => falla,
  );
  expect(error).toBeInstanceOf(PdfConContenidoActivo);
  return (error as PdfConContenidoActivo).detalles as string[];
}

describe('PDF con contenido activo (qpdf real)', () => {
  cuando('rechaza un OpenAction con JavaScript en claro y dice qué encontró', async () => {
    const pdf = pdfDePrueba({ catalogo: '/OpenAction << /S /JavaScript /JS (app.alert\\(1\\)) >>' });

    expect(await hallazgosDe(pdf)).toEqual(['/JS', '/JavaScript', '/OpenAction']);
  });

  cuando('rechaza el JavaScript escrito con el nombre en hexadecimal', async () => {
    const pdf = pdfDePrueba({ catalogo: '/OpenAction << /S /#4aava#53cript /#4aS (x) >>' });

    expect(await hallazgosDe(pdf)).toContain('/JavaScript');
  });

  cuando('rechaza el JavaScript que queda dentro de un object stream', async () => {
    const claro = pdfDePrueba({ catalogo: '/OpenAction << /S /JavaScript /JS (app.alert\\(1\\)) >>' });
    const conFlujo = transformarConQpdf(claro, ['--object-streams=generate']);

    expect(conFlujo.includes('ObjStm')).toBe(true);
    expect(conFlujo.includes('app.alert')).toBe(false);
    expect(await hallazgosDe(conFlujo)).toContain('/JavaScript');
  });

  cuando('rechaza un OpenAction que apunta por referencia a una acción con JavaScript', async () => {
    const accion = objetoDePdf(4, '<< /S /JavaScript /JS (x) >>');

    expect(await hallazgosDe(pdfDePrueba({ catalogo: '/OpenAction 4 0 R', objetos: [accion] }))).toContain(
      '/OpenAction',
    );
  });

  const casos: [string, string, string][] = [
    ['/Launch', '/OpenAction << /S /Launch /F (cmd.exe) >>', '/Launch'],
    ['/GoToR', '/OpenAction << /S /GoToR /F (otro.pdf) /D [0 /Fit] >>', '/GoToR'],
    ['/SubmitForm', '/OpenAction << /S /SubmitForm /F (http://x.test) >>', '/SubmitForm'],
    ['/XFA', '/AcroForm << /XFA [(template) (datos)] /Fields [] >>', '/XFA'],
    ['/AA', '/AA << /WC << /S /GoTo /D [3 0 R /Fit] >> >>', '/AA'],
    ['/RichMedia', '/Names << /X << /RichMedia << >> >> >>', '/RichMedia'],
  ];

  cuando.each(casos)('rechaza %s', async (_nombre, catalogo, esperado) => {
    expect(await hallazgosDe(pdfDePrueba({ catalogo }))).toContain(esperado);
  });

  cuando('rechaza un archivo adjunto (/EmbeddedFiles)', async () => {
    const especificacion = objetoDePdf(4, '<< /Type /Filespec /F (a.txt) /EF << /F 5 0 R >> >>');
    const adjunto = '5 0 obj\n<< /Type /EmbeddedFile /Length 3 >>\nstream\nabc\nendstream\nendobj';
    const catalogo = '/Names << /EmbeddedFiles << /Names [(a.txt) 4 0 R] >> >>';

    const hallazgos = await hallazgosDe(pdfDePrueba({ catalogo, objetos: [especificacion, adjunto] }));

    expect(hallazgos).toEqual(expect.arrayContaining(['/EmbeddedFiles', '/EmbeddedFile']));
  });
});

describe('PDF aceptados (qpdf real)', () => {
  cuando('acepta un enlace /URI y un destino al abrir', async () => {
    const enlace = '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] /A << /S /URI /URI (https://ejemplo.com) >> >>';
    const pdf = pdfDePrueba({ catalogo: '/OpenAction [3 0 R /Fit]', pagina: `/Annots [${enlace}]` });

    const resultado = await inspector.inspeccionar(pdf);

    expect(resultado.paginas).toBe(1);
    expect(resultado.contenido.toString('latin1', 0, 5)).toBe('%PDF-');
  });

  cuando('acepta un OpenAction /GoTo', async () => {
    const pdf = pdfDePrueba({ catalogo: '/OpenAction << /S /GoTo /D [3 0 R /Fit] >>' });

    expect((await inspector.inspeccionar(pdf)).paginas).toBe(1);
  });

  cuando('lo que estaba pegado al final del PDF no llega al archivo guardado', async () => {
    const zip = Buffer.concat([Buffer.from('PK\x03\x04', 'latin1'), Buffer.from('carga escondida'), Buffer.alloc(50)]);

    const resultado = await inspector.inspeccionar(Buffer.concat([pdfDePrueba(), zip]));

    expect(resultado.contenido.includes('carga escondida')).toBe(false);
    expect(resultado.contenido.includes(Buffer.from('PK\x03\x04', 'latin1'))).toBe(false);
  });

  cuando('acepta un PDF con restricciones de propietario y lo guarda sin cifrar', async () => {
    const restringido = transformarConQpdf(pdfDePrueba(), ['--encrypt', '', 'duena', '256', '--']);
    expect(restringido.includes('/Encrypt')).toBe(true);

    const resultado = await inspector.inspeccionar(restringido);

    expect(resultado.contenido.includes('/Encrypt')).toBe(false);
    expect(resultado.paginas).toBe(1);
  });
});

describe('PDF que no se acepta (qpdf real)', () => {
  cuando('rechaza con ayuda un PDF cifrado con contraseña de usuario', async () => {
    const cifrado = transformarConQpdf(pdfDePrueba(), ['--encrypt', 'clave', 'duena', '256', '--']);

    const error = await inspector.inspeccionar(cifrado).catch((falla: unknown) => falla);

    expect(error).toBeInstanceOf(PdfConContrasena);
    expect((error as Error).message).toContain('Imprimir > Guardar como PDF');
  });

  cuando('rechaza un PDF truncado', async () => {
    const completo = transformarConQpdf(pdfDePrueba(), []);

    await expect(inspector.inspeccionar(completo.subarray(0, completo.length / 2))).rejects.toBeInstanceOf(PdfDanado);
  });

  cuando('rechaza algo que solo tiene la firma', async () => {
    await expect(inspector.inspeccionar(Buffer.from('%PDF-1.7\nnada más'))).rejects.toBeInstanceOf(PdfDanado);
  });

  cuando('rechaza más de 300 páginas', async () => {
    const error = await inspector.inspeccionar(pdfDePrueba({ paginas: 301 })).catch((falla: unknown) => falla);

    expect(error).toBeInstanceOf(PdfConDemasiadasPaginas);
  });

  cuando('acepta 300 páginas', async () => {
    expect((await inspector.inspeccionar(pdfDePrueba({ paginas: 300 }))).paginas).toBe(300);
  });

  cuando('un JPEG con nombre de PDF no es un PDF', async () => {
    const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } })
      .jpeg()
      .toBuffer();

    await expect(inspector.inspeccionar(jpeg)).rejects.toBeInstanceOf(DocumentoNoAceptado);
  });

  cuando('si qpdf gasta más memoria de la permitida responde con error propio, no un 500', async () => {
    const limitado = new InspectorQpdf(
      new EjecutorDeQpdf(RUTA_QPDF_DE_PRUEBA, { ...LIMITES_DE_QPDF, memoriaEnBytes: 8e6 }),
    );

    await expect(limitado.inspeccionar(pdfDePrueba())).rejects.toBeInstanceOf(PdfNoSePudoRevisar);
  });

  cuando('no deja archivos temporales después de revisar', async () => {
    const antes = readdirSync(tmpdir()).filter((nombre) => nombre.startsWith('arrancar-pdf-'));

    await inspector.inspeccionar(pdfDePrueba());
    await inspector.inspeccionar(Buffer.from('%PDF-basura')).catch(() => null);

    const despues = readdirSync(tmpdir()).filter((nombre) => nombre.startsWith('arrancar-pdf-'));
    expect(despues).toEqual(antes);
  });
});

describe('firma del PDF (sin qpdf)', () => {
  it('no arranca ningún proceso si no empieza con %PDF- en el byte 0', async () => {
    const sinQpdf = new InspectorQpdf(new EjecutorDeQpdf('/no/existe/qpdf'));

    await expect(sinQpdf.inspeccionar(Buffer.from('\n%PDF-1.7'))).rejects.toBeInstanceOf(DocumentoNoAceptado);
    await expect(sinQpdf.inspeccionar(Buffer.from('GIF89a'))).rejects.toBeInstanceOf(DocumentoNoAceptado);
  });
});
