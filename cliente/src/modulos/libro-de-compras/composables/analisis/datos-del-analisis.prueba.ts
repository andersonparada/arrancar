import { describe, expect, it } from 'vitest';
import {
  analisisTrasLaTecla,
  cantidadDeFilas,
  consultaDe,
  estaVacio,
  etiquetaDelMes,
  mesesDelRango,
  nombreDelCombustible,
  problemaDelRango,
  rangoPorOmision,
  resumenDelRango,
  textosDelMotivo,
} from './datos-del-analisis';

describe('rango del análisis', () => {
  it('por omisión va de enero del año en curso al mes en curso', () => {
    expect(rangoPorOmision(new Date(2026, 9, 20))).toEqual({ desde: '2026-01', hasta: '2026-10' });
  });

  it('cuenta los meses con los dos extremos', () => {
    expect(mesesDelRango({ desde: '2026-01', hasta: '2026-10' })).toBe(10);
    expect(mesesDelRango({ desde: '2025-12', hasta: '2026-01' })).toBe(2);
    expect(mesesDelRango({ desde: '2026-03', hasta: '2026-03' })).toBe(1);
  });

  it('acepta hasta 24 meses y rechaza 25 o un rango al revés, diciendo qué corregir', () => {
    expect(problemaDelRango({ desde: '2025-01', hasta: '2026-12' })).toBeNull();
    expect(problemaDelRango({ desde: '2025-01', hasta: '2027-01' })).toContain('24 meses');
    expect(problemaDelRango({ desde: '2026-05', hasta: '2026-04' })).toContain('no puede ser anterior');
  });

  it('lo resume en palabras', () => {
    expect(resumenDelRango({ desde: '2026-01', hasta: '2026-10' })).toBe(
      'De Enero de 2026 a Octubre de 2026 (10 meses)',
    );
    expect(resumenDelRango({ desde: '2026-03', hasta: '2026-03' })).toBe('Marzo de 2026 (1 mes)');
  });

  it('da la etiqueta del mes también con fecha completa', () => {
    expect(etiquetaDelMes('2026-03-01')).toBe('Marzo de 2026');
  });
});

describe('consulta al servidor', () => {
  const rango = { desde: '2026-01', hasta: '2026-03' };

  it('la casilla de fuera del libro solo viaja en «por proveedor»', () => {
    expect(consultaDe('compras-por-proveedor', rango, true)).toEqual({ ...rango, incluirFueraDelLibro: true });
    expect(consultaDe('compras-por-proveedor', rango, false)).toEqual(rango);
    expect(consultaDe('combustibles', rango, true)).toEqual(rango);
  });
});

describe('textos', () => {
  it('el motivo lleva su nombre corto y su explicación completa', () => {
    const texto = textosDelMotivo('fuera_de_plazo');
    expect(texto.titulo).toBe('Fuera de plazo');
    expect(texto.explicacion).toContain('art. 20');
  });

  it('un motivo desconocido o ausente no rompe', () => {
    expect(textosDelMotivo('otro')).toEqual({ titulo: 'otro', explicacion: '' });
    expect(textosDelMotivo(null).titulo).toBe('Sin motivo');
  });

  it('el combustible sin catálogo se nombra', () => {
    expect(nombreDelCombustible('Diésel')).toBe('Diésel');
    expect(nombreDelCombustible(null)).toContain('IDP según la factura');
  });
});

describe('vacío y conteo', () => {
  it('detecta cada forma de resultado vacío', () => {
    expect(estaVacio('activos-fijos', { filas: [], total: { costo: '0.00', ivaConCredito: '0.00' } })).toBe(true);
    expect(estaVacio('iva-al-costo', { motivos: [], total: '0.00' })).toBe(true);
    const sumas = { galones: '0.000', idp: '0.00', base: '0.00', iva: '0.00', exentoYNoAfecto: '0.00' };
    expect(estaVacio('combustibles', { combustibles: [], total: sumas })).toBe(true);
  });

  it('cuenta las líneas de IVA al costo de todos los motivos', () => {
    const linea = { documentoId: 'd' } as never;
    const datos = {
      motivos: [
        { motivo: 'a', lineas: [linea, linea], subtotal: '1.00' },
        { motivo: 'b', lineas: [linea], subtotal: '1.00' },
      ],
      total: '2.00',
    };
    expect(estaVacio('iva-al-costo', datos)).toBe(false);
    expect(cantidadDeFilas('iva-al-costo', datos)).toBe(3);
  });
});

describe('teclado de las pestañas', () => {
  it('las flechas dan la vuelta y Inicio y Fin van a los extremos', () => {
    expect(analisisTrasLaTecla('compras-por-proveedor', 'ArrowRight')).toBe('compras-por-concepto');
    expect(analisisTrasLaTecla('compras-por-proveedor', 'ArrowLeft')).toBe('combustibles');
    expect(analisisTrasLaTecla('combustibles', 'ArrowRight')).toBe('compras-por-proveedor');
    expect(analisisTrasLaTecla('iva-al-costo', 'Home')).toBe('compras-por-proveedor');
    expect(analisisTrasLaTecla('iva-al-costo', 'End')).toBe('combustibles');
  });

  it('otras teclas no mueven', () => {
    expect(analisisTrasLaTecla('iva-al-costo', 'a')).toBeNull();
  });
});
