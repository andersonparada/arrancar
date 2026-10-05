import { describe, expect, it } from 'vitest';
import { NitInvalido } from '../../core/compartido/dominio/objetos-valor/nit.js';
import {
  DatosDeLaFelIncompletos,
  NitDelEmisorInvalido,
  NitDelEmisorNoCoincide,
  ReceptorInvalido,
  ReciboDebeQuedarFueraDelLibro,
  TipoNoCorrespondeAlProveedor,
} from './errores-de-documento.js';
import { MotivoFueraDelLibroIncoherente } from './fuera-del-libro.js';
import {
  exigirReceptorCoherente,
  exigirReciboFueraDelLibro,
  AVISO_DE_CAMBIO_DE_REGIMEN,
  exigirTipoDelProveedor,
  receptorDelDocumento,
  resolverEmisor,
  type DatosDelEmisor,
} from './reglas-del-encabezado.js';

const FEL = '5b0f3c4e-6c1d-4f8e-9c3a-0d6c7e8f9a1b';
const emisor = (cambios: Partial<DatosDelEmisor> = {}): DatosDelEmisor => ({
  muestraEnReportesSat: true,
  nitEmisor: '576937K',
  serie: 'A',
  autorizacionFel: FEL,
  nitDelProveedor: null,
  ...cambios,
});

describe('el emisor del documento (H10)', () => {
  it('en el libro, si el proveedor no tiene NIT se le completa con el del documento, normalizado', () => {
    expect(resolverEmisor(emisor({ nitEmisor: '576937-k' }))).toEqual({
      nitEmisor: '576937K',
      nitParaCompletar: '576937K',
    });
  });

  it('si el proveedor tiene el mismo NIT no se completa nada, y si tiene otro es un error', () => {
    expect(resolverEmisor(emisor({ nitDelProveedor: '576937K' }))).toEqual({
      nitEmisor: '576937K',
      nitParaCompletar: null,
    });
    expect(() => resolverEmisor(emisor({ nitDelProveedor: '12345679' }))).toThrow(NitDelEmisorNoCoincide);
  });

  it('en el libro exige NIT, serie y FEL, un NIT válido y que no sea consumidor final', () => {
    expect(() => resolverEmisor(emisor({ nitEmisor: null }))).toThrow(DatosDeLaFelIncompletos);
    expect(() => resolverEmisor(emisor({ serie: null }))).toThrow(DatosDeLaFelIncompletos);
    expect(() => resolverEmisor(emisor({ autorizacionFel: null }))).toThrow(DatosDeLaFelIncompletos);
    expect(() => resolverEmisor(emisor({ nitEmisor: '5769370' }))).toThrow(NitInvalido);
    expect(() => resolverEmisor(emisor({ nitEmisor: 'CF' }))).toThrow(NitDelEmisorInvalido);
  });

  it('fuera del libro el emisor es el NIT del proveedor, si lo tiene y no es consumidor final', () => {
    const fuera = { muestraEnReportesSat: false, nitEmisor: null, serie: null, autorizacionFel: null };

    expect(resolverEmisor(emisor({ ...fuera, nitDelProveedor: '576937K' }))).toEqual({
      nitEmisor: '576937K',
      nitParaCompletar: null,
    });
    expect(resolverEmisor(emisor({ ...fuera, nitDelProveedor: null }))).toEqual({
      nitEmisor: null,
      nitParaCompletar: null,
    });
    expect(resolverEmisor(emisor({ ...fuera, nitDelProveedor: 'CF' })).nitEmisor).toBeNull();
  });
});

describe('tipo, recibo y receptor', () => {
  it('la factura de pequeño contribuyente y la general deben corresponder al régimen del proveedor', () => {
    expect(() => exigirTipoDelProveedor('factura_pequeno_contribuyente', false)).toThrow(TipoNoCorrespondeAlProveedor);
    expect(() => exigirTipoDelProveedor('factura', true)).toThrow(TipoNoCorrespondeAlProveedor);
    expect(() => exigirTipoDelProveedor('factura', false)).not.toThrow();
    expect(() => exigirTipoDelProveedor('recibo', true)).not.toThrow();
  });

  it('el error del tipo sugiere actualizar los datos fiscales o confirmar el cambio de régimen', () => {
    expect(() => exigirTipoDelProveedor('factura', true)).toThrow(
      /Si el proveedor cambió de régimen, actualice sus datos fiscales o confirme\./,
    );
  });

  it('con la confirmación del cambio de régimen deja pasar el tipo y lo señala; sin cambio no señala nada', () => {
    expect(exigirTipoDelProveedor('factura', true, true)).toBe(true);
    expect(exigirTipoDelProveedor('factura_pequeno_contribuyente', false, true)).toBe(true);
    expect(exigirTipoDelProveedor('factura', false, true)).toBe(false);
    expect(AVISO_DE_CAMBIO_DE_REGIMEN).toBe(
      'El proveedor cambió de régimen: confirme que la factura es anterior al cambio.',
    );
  });

  it('el recibo solo va con la casilla desmarcada', () => {
    expect(() => exigirReciboFueraDelLibro('recibo', true)).toThrow(ReciboDebeQuedarFueraDelLibro);
    expect(() => exigirReciboFueraDelLibro('recibo', false)).not.toThrow();
    expect(() => exigirReciboFueraDelLibro('factura', true)).not.toThrow();
  });

  it('una FEL fuera del libro dice a quién se emitió, y concuerda con el motivo', () => {
    expect(() => exigirReceptorCoherente('fel_a_otro_nit', null)).toThrow(MotivoFueraDelLibroIncoherente);
    expect(() => exigirReceptorCoherente('fel_a_otro_nit', 'CF')).toThrow(MotivoFueraDelLibroIncoherente);
    expect(() => exigirReceptorCoherente('fel_a_consumidor_final', '576937K')).toThrow(MotivoFueraDelLibroIncoherente);
    expect(() => exigirReceptorCoherente('fel_a_consumidor_final', 'CF')).not.toThrow();
    expect(() => exigirReceptorCoherente('sin_fel', null)).not.toThrow();
    expect(() => exigirReceptorCoherente(null, null)).not.toThrow();
  });
});

describe('el receptor de la FEL', () => {
  it('acepta un NIT (también consumidor final) o un CUI, normalizados', () => {
    expect(receptorDelDocumento('576937-k')).toBe('576937K');
    expect(receptorDelDocumento('cf')).toBe('CF');
    expect(receptorDelDocumento('1234 56789 0101')).toBe('1234567890101');
  });

  it('sin texto queda vacío, y un dato que no es NIT ni CUI se rechaza', () => {
    expect(receptorDelDocumento(null)).toBeNull();
    expect(receptorDelDocumento('  ')).toBeNull();
    expect(() => receptorDelDocumento('5769370')).toThrow(ReceptorInvalido);
    expect(() => receptorDelDocumento('1234567890100')).toThrow(ReceptorInvalido);
  });

  it('un CUI concuerda con una FEL a otro NIT, no con una a consumidor final', () => {
    expect(() => exigirReceptorCoherente('fel_a_otro_nit', '1234567890101')).not.toThrow();
    expect(() => exigirReceptorCoherente('fel_a_consumidor_final', '1234567890101')).toThrow(
      MotivoFueraDelLibroIncoherente,
    );
  });
});
