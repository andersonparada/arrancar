import { describe, expect, it } from 'vitest';
import { NitInvalido } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { AVISO_DE_RETENCION_QUITADA, avisosDeRetenciones } from './avisos-de-retenciones.js';
import {
  AVISO_DE_PROVEEDOR_NO_DOMICILIADO,
  AVISO_DE_PROVEEDOR_SIN_DATOS_FISCALES,
  avisosDelProveedor,
} from './avisos-del-proveedor.js';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import {
  DatosDeLaFelIncompletos,
  NitDelEmisorInvalido,
  NitDelEmisorNoCoincide,
  ReciboDebeQuedarFueraDelLibro,
  TipoNoCorrespondeAlProveedor,
} from './errores-de-documento.js';
import { MotivoFueraDelLibroIncoherente } from './fuera-del-libro.js';
import { AVISO_DE_NOTA_TARDIA, avisosDeNotaTardia } from './reglas-de-notas-de-credito.js';
import {
  exigirReceptorCoherente,
  exigirReciboFueraDelLibro,
  exigirTipoDelProveedor,
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

describe('avisos', () => {
  const retencion = (cambios: Partial<RetencionDeDocumento> = {}): RetencionDeDocumento => ({
    impuesto: 'iva',
    regla: 'iva_contribuyente_especial',
    base: 60000,
    porcentaje: 1500,
    montoPropuesto: 9000,
    monto: 9000,
    motivoDelAjuste: null,
    fecha: '2026-06-10',
    ...cambios,
  });
  const entero = { hoy: '2026-10-04', fechaDeRecepcion: '2026-06-10', diasHabilesIva: 15, diasHabilesIsr: 10 };

  it('avisa el entero vencido de cada impuesto una sola vez, y nada si el plazo no pasó', () => {
    const avisos = avisosDeRetenciones([retencion(), retencion({ regla: 'iva_exportador' })], entero);

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('retención de IVA venció el 21/07/2026');
    expect(avisosDeRetenciones([retencion()], { ...entero, hoy: '2026-07-21' })).toEqual([]);
  });

  it('el entero del ISR se cuenta desde la recepción, no desde la emisión', () => {
    const isr = retencion({ impuesto: 'isr', regla: 'isr_opcional_simplificado', fecha: '2026-01-05' });

    const avisos = avisosDeRetenciones([isr], { ...entero, hoy: '2026-07-14', fechaDeRecepcion: '2026-06-30' });

    expect(avisos).toEqual([]);
  });

  it('una retención quitada avisa la responsabilidad solidaria y no cuenta para el entero', () => {
    const quitada = retencion({ monto: 0, motivoDelAjuste: 'Exento' });

    expect(avisosDeRetenciones([quitada], entero)).toEqual([AVISO_DE_RETENCION_QUITADA]);
  });

  it('avisa la nota emitida más de dos meses después de su factura', () => {
    expect(avisosDeNotaTardia('2027-01-05', '2026-10-01')).toEqual([AVISO_DE_NOTA_TARDIA]);
    expect(avisosDeNotaTardia('2026-12-01', '2026-10-31')).toEqual([]);
  });

  it('avisa un proveedor sin datos fiscales si la empresa retiene, y un no domiciliado', () => {
    const empresa = DatosFiscalesDeEmpresa.porOmision();
    const sinAgente = DatosFiscalesDeEmpresa.crear({ ...empresa.instantanea(), esAgenteDeRetencionIsr: false });
    const proveedor = DatosFiscalesDeProveedor.porOmision();
    const extranjero = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'no_domiciliado' });

    expect(avisosDelProveedor({ empresa, proveedor, proveedorSinDatosFiscales: true })).toEqual([
      AVISO_DE_PROVEEDOR_SIN_DATOS_FISCALES,
    ]);
    expect(avisosDelProveedor({ empresa: sinAgente, proveedor, proveedorSinDatosFiscales: true })).toEqual([]);
    expect(avisosDelProveedor({ empresa, proveedor: extranjero, proveedorSinDatosFiscales: false })).toEqual([
      AVISO_DE_PROVEEDOR_NO_DOMICILIADO,
    ]);
  });
});
