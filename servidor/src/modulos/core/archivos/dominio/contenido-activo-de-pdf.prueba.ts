import { describe, expect, it } from 'vitest';
import { buscarContenidoActivo } from './contenido-activo-de-pdf.js';
import { PdfDanado } from './documento.js';

/** El JSON v2 de qpdf con `--json-key=qpdf`: el segundo elemento de `qpdf` trae los objetos. */
const jsonConObjetos = (objetos: Record<string, unknown>) => ({ version: 2, qpdf: [{ jsonversion: 2 }, objetos] });
const catalogo = (valor: Record<string, unknown>) => jsonConObjetos({ 'obj:1 0 R': { value: valor } });

describe('buscar contenido activo en el JSON de qpdf', () => {
  it('un PDF limpio no tiene hallazgos, aunque tenga enlaces, destinos y nombres', () => {
    const json = jsonConObjetos({
      'obj:1 0 R': { value: { '/Type': '/Catalog', '/OpenAction': ['3 0 R', '/Fit'], '/Names': '5 0 R' } },
      'obj:4 0 R': { value: { '/S': '/URI', '/URI': 'u:https://ejemplo.com' } },
      'obj:5 0 R': { value: { '/S': '/Named', '/N': '/NextPage' } },
      trailer: { value: { '/Root': '1 0 R' } },
    });

    expect(buscarContenidoActivo(json)).toEqual([]);
  });

  it.each([
    ['/JS', { '/JS': 'u:x' }],
    ['/Launch', { '/Launch': {} }],
    ['/EmbeddedFiles', { '/Names': { '/EmbeddedFiles': {} } }],
    ['/XFA', { '/AcroForm': { '/XFA': [] } }],
    ['/AA', { '/AA': {} }],
    ['/RichMedia', { '/RichMedia': {} }],
    ['/Movie', { '/Movie': {} }],
    ['/Sound', { '/Sound': {} }],
    ['/GoToE', { '/A': { '/S': '/GoToE' } }],
    ['/Rendition', { '/A': { '/S': '/Rendition' } }],
    ['/ImportData', { '/A': { '/S': '/ImportData' } }],
    ['/EmbeddedFile', { '/Type': '/EmbeddedFile' }],
  ])('encuentra %s', (esperado, valor) => {
    expect(buscarContenidoActivo(catalogo(valor))).toContain(esperado);
  });

  it('un OpenAction que no es destino ni /GoTo se rechaza, también por referencia', () => {
    const porReferencia = jsonConObjetos({
      'obj:1 0 R': { value: { '/OpenAction': '7 0 R' } },
      'obj:7 0 R': { value: { '/S': '/Named', '/N': '/Print' } },
    });

    expect(buscarContenidoActivo(catalogo({ '/OpenAction': { '/S': '/Named' } }))).toEqual(['/OpenAction']);
    expect(buscarContenidoActivo(porReferencia)).toEqual(['/OpenAction']);
  });

  it('un OpenAction /GoTo por referencia se permite', () => {
    const json = jsonConObjetos({
      'obj:1 0 R': { value: { '/OpenAction': '7 0 R' } },
      'obj:7 0 R': { value: { '/S': '/GoTo', '/D': ['3 0 R', '/Fit'] } },
    });

    expect(buscarContenidoActivo(json)).toEqual([]);
  });

  it('busca también dentro del diccionario de un stream', () => {
    const json = jsonConObjetos({ 'obj:9 0 R': { stream: { dict: { '/Type': '/EmbeddedFile' } } } });

    expect(buscarContenidoActivo(json)).toEqual(['/EmbeddedFile']);
  });

  it('un JSON que no es de qpdf es un PDF dañado', () => {
    expect(() => buscarContenidoActivo({ nada: 1 })).toThrow(PdfDanado);
    expect(() => buscarContenidoActivo(null)).toThrow(PdfDanado);
  });
});
