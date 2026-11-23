import { describe, expect, it } from 'vitest';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';
import type { DocumentoPorRecibir } from './agrupar-lineas';
import {
  alternarLinea,
  documentoMarcado,
  marcarDocumento,
  recibiblesDe,
  seleccionVigente,
} from './seleccion-de-lineas';

const linea = (lineaId: string, tipoDeDocumento = 'factura') => ({ lineaId, tipoDeDocumento }) as LineaPorRecibir;
const documento = (lineas: LineaPorRecibir[]): DocumentoPorRecibir =>
  ({ documentoId: 'd1', lineas }) as DocumentoPorRecibir;

describe('selección de líneas por recibir', () => {
  it('alterna sin tocar la original', () => {
    const original = ['a'];
    expect(alternarLinea(original, 'b')).toEqual(['a', 'b']);
    expect(alternarLinea(original, 'a')).toEqual([]);
    expect(original).toEqual(['a']);
  });

  it('solo las líneas de facturas se pueden recibir', () => {
    expect(recibiblesDe(documento([linea('a'), linea('n', 'nota_de_credito')]))).toEqual(['a']);
  });

  it('marca y desmarca las de un documento sin tocar las de otros', () => {
    const doc = documento([linea('a'), linea('b')]);
    expect(marcarDocumento(['x'], doc, true)).toEqual(['x', 'a', 'b']);
    expect(marcarDocumento(['x', 'a'], doc, false)).toEqual(['x']);
  });

  it('un documento está marcado cuando lo están todas sus líneas recibibles', () => {
    const doc = documento([linea('a'), linea('b')]);
    expect(documentoMarcado(['a'], doc)).toBe(false);
    expect(documentoMarcado(['a', 'b'], doc)).toBe(true);
    expect(documentoMarcado([], documento([linea('n', 'nota_de_credito')]))).toBe(false);
  });

  it('olvida lo que ya no está en la bandeja', () => {
    expect(seleccionVigente(['a', 'b'], ['b', 'c'])).toEqual(['b']);
  });
});
