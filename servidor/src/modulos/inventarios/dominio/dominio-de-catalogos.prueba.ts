import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Articulo, ArticuloInvalido, type DatosDeArticulo } from './articulo.js';
import { validarConversiones } from './conversion.js';
import { ConversionInvalida, LoteInvalido } from './errores.js';
import { lotePermitido } from './lote.js';
import { Unidad, UnidadInvalido, type DatosDeUnidad } from './unidad.js';
import { UNIDADES_SUGERIDAS } from './unidades-iniciales.js';

const empresa = Identificador.nuevo<'Empresa'>();

const datosDeUnidad = (cambios: Partial<DatosDeUnidad> = {}): DatosDeUnidad => ({
  nombre: 'Quintal',
  simbolo: 'qq',
  magnitud: 'masa',
  factorALaReferencia: '100',
  activo: true,
  ...cambios,
});

const datosDeArticulo = (cambios: Partial<DatosDeArticulo> = {}): DatosDeArticulo => ({
  codigo: 'ART-1',
  nombre: 'Concentrado',
  descripcion: null,
  categoriaId: 'c',
  tipoDeInventario: 'mercaderia',
  unidadBaseId: 'u',
  manejaLotes: false,
  manejaVencimiento: false,
  codigoDeBarras: null,
  conceptoDeGastoId: null,
  existenciaMinima: null,
  pesoKgPorUnidadBase: null,
  activo: true,
  ...cambios,
});

describe('unidad de medida', () => {
  it('masa, volumen, longitud y superficie llevan factor mayor que cero', () => {
    expect(() => Unidad.crear(empresa, datosDeUnidad({ factorALaReferencia: null }))).toThrow(UnidadInvalido);
    expect(() => Unidad.crear(empresa, datosDeUnidad({ factorALaReferencia: '0' }))).toThrow(UnidadInvalido);
    expect(Unidad.crear(empresa, datosDeUnidad()).instantanea().factorALaReferencia).toBe('100');
  });

  it('cantidad y empaque no llevan factor', () => {
    const caja = datosDeUnidad({ nombre: 'Caja', magnitud: 'empaque', factorALaReferencia: null });

    expect(Unidad.crear(empresa, caja).instantanea().factorALaReferencia).toBeNull();
    expect(() => Unidad.crear(empresa, { ...caja, factorALaReferencia: '2' })).toThrow(UnidadInvalido);
  });

  it('recorta el nombre y respeta los largos máximos', () => {
    expect(Unidad.crear(empresa, datosDeUnidad({ nombre: '  Quintal ' })).instantanea().nombre).toBe('Quintal');
    expect(() => Unidad.crear(empresa, datosDeUnidad({ nombre: 'x'.repeat(41) }))).toThrow(UnidadInvalido);
    expect(() => Unidad.crear(empresa, datosDeUnidad({ simbolo: 'x'.repeat(11) }))).toThrow(UnidadInvalido);
  });

  it('toda la lista sugerida es válida y no repite nombre ni símbolo', () => {
    for (const sugerida of UNIDADES_SUGERIDAS)
      expect(() => Unidad.crear(empresa, { ...sugerida, activo: true })).not.toThrow();
    expect(new Set(UNIDADES_SUGERIDAS.map((u) => u.nombre.toLowerCase())).size).toBe(UNIDADES_SUGERIDAS.length);
    expect(new Set(UNIDADES_SUGERIDAS.map((u) => u.simbolo.toUpperCase())).size).toBe(UNIDADES_SUGERIDAS.length);
  });

  it('el quintal vale 100 libras, la arroba 25 y la libra es la referencia de la masa', () => {
    const factor = (nombre: string) => UNIDADES_SUGERIDAS.find((u) => u.nombre === nombre)?.factorALaReferencia;

    expect([factor('Libra'), factor('Quintal'), factor('Arroba'), factor('Galón'), factor('Metro')]).toEqual([
      '1',
      '100',
      '25',
      '1',
      '1',
    ]);
  });
});

describe('artículo', () => {
  it('el código lleva letras, números, punto, guion y diagonal, hasta 30', () => {
    expect(Articulo.crear(empresa, datosDeArticulo({ codigo: ' AB-1.2/3 ' })).instantanea().codigo).toBe('AB-1.2/3');
    expect(() => Articulo.crear(empresa, datosDeArticulo({ codigo: 'A B' }))).toThrow(ArticuloInvalido);
    expect(() => Articulo.crear(empresa, datosDeArticulo({ codigo: 'A'.repeat(31) }))).toThrow(ArticuloInvalido);
  });

  it('el vencimiento exige lotes', () => {
    expect(() => Articulo.crear(empresa, datosDeArticulo({ manejaVencimiento: true }))).toThrow(ArticuloInvalido);
    expect(() =>
      Articulo.crear(empresa, datosDeArticulo({ manejaVencimiento: true, manejaLotes: true })),
    ).not.toThrow();
  });

  it('la existencia mínima puede ser cero y el peso debe ser mayor que cero', () => {
    expect(() => Articulo.crear(empresa, datosDeArticulo({ existenciaMinima: '0' }))).not.toThrow();
    expect(() => Articulo.crear(empresa, datosDeArticulo({ pesoKgPorUnidadBase: '0.0000' }))).toThrow(ArticuloInvalido);
  });

  it('los textos vacíos opcionales quedan en nulo', () => {
    const articulo = Articulo.crear(empresa, datosDeArticulo({ descripcion: '  ', codigoDeBarras: '' }));

    expect(articulo.instantanea()).toMatchObject({ descripcion: null, codigoDeBarras: null });
  });
});

describe('conversiones', () => {
  const conversion = (unidadId: string, factor = '24', paraCompras = false) => ({ unidadId, factor, paraCompras });

  it('acepta una lista sin repetidas, sin la base y con una sola de compras', () => {
    expect(() => validarConversiones('base', [conversion('caja', '24', true), conversion('saco', '50')])).not.toThrow();
  });

  it('rechaza la base, las repetidas, el factor que no es positivo y dos de compras', () => {
    expect(() => validarConversiones('base', [conversion('base')])).toThrow(ConversionInvalida);
    expect(() => validarConversiones('base', [conversion('caja'), conversion('caja')])).toThrow(ConversionInvalida);
    expect(() => validarConversiones('base', [conversion('caja', '-1')])).toThrow(ConversionInvalida);
    expect(() => validarConversiones('base', [conversion('caja', 'abc')])).toThrow(ConversionInvalida);
    expect(() => validarConversiones('base', [conversion('caja', '1', true), conversion('saco', '1', true)])).toThrow(
      ConversionInvalida,
    );
  });
});

describe('lote', () => {
  const datos = { codigo: ' L-1 ', fechaDeVencimiento: '2027-01-01', fechaDeFabricacion: null, observaciones: ' ' };

  it('limpia el código y las observaciones', () => {
    const lote = lotePermitido({ manejaLotes: true, manejaVencimiento: true }, datos);

    expect(lote).toMatchObject({ codigo: 'L-1', observaciones: null });
  });

  it('exige que el artículo maneje lotes, el vencimiento si lo maneja y fechas coherentes', () => {
    expect(() => lotePermitido({ manejaLotes: false, manejaVencimiento: false }, datos)).toThrow(LoteInvalido);
    expect(() =>
      lotePermitido({ manejaLotes: true, manejaVencimiento: true }, { ...datos, fechaDeVencimiento: null }),
    ).toThrow(LoteInvalido);
    expect(() =>
      lotePermitido({ manejaLotes: true, manejaVencimiento: false }, { ...datos, fechaDeFabricacion: '2027-06-01' }),
    ).toThrow(LoteInvalido);
    expect(() => lotePermitido({ manejaLotes: true, manejaVencimiento: false }, { ...datos, codigo: ' ' })).toThrow(
      LoteInvalido,
    );
  });
});
