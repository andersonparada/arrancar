import { describe, expect, it } from 'vitest';
import { calcularDocumento, type DatosParaCalcular } from './calculo-de-documento.js';
import { PeriodoInvalido } from './errores-de-calculo.js';
import { determinarMotivoSinCredito } from './motivo-sin-credito.js';

const datos = (cambios: Partial<DatosParaCalcular> = {}): DatosParaCalcular => ({
  tipo: 'factura',
  muestraEnReportesSat: true,
  noVinculado: false,
  fechaDeEmision: '2026-01-15',
  fechaDeRecepcion: '2026-01-20',
  periodo: '2026-01-01',
  lineas: [{ total: 11200, exento: 0 }],
  tasaDeIva: 1200,
  ...cambios,
});

const nota = (cambios: Partial<DatosParaCalcular> = {}): DatosParaCalcular =>
  datos({
    tipo: 'nota_de_credito',
    fechaDeEmision: '2026-05-02',
    fechaDeRecepcion: '2026-05-10',
    periodo: '2026-05-01',
    ...cambios,
  });

describe('calcularDocumento: factura de régimen general', () => {
  it('en plazo da crédito: sin motivo ni IVA al costo', () => {
    const documento = calcularDocumento(datos());
    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.avisos).toEqual([]);
    expect(documento.totales).toEqual({ total: 11200, base: 10000, iva: 1200, ivaNoAcreditable: 0, idp: 0, exento: 0 });
  });

  it('el último día del plazo (marzo para enero) todavía da crédito', () => {
    expect(
      calcularDocumento(datos({ periodo: '2026-03-01', fechaDeRecepcion: '2026-03-31' })).motivoSinCredito,
    ).toBeNull();
  });

  it('fuera de plazo: motivo, aviso y el IVA al costo de cada línea', () => {
    const documento = calcularDocumento(
      datos({
        periodo: '2026-04-01',
        fechaDeRecepcion: '2026-04-05',
        lineas: [
          { total: 11200, exento: 0 },
          { total: 5600, exento: 0 },
        ],
      }),
    );
    expect(documento.motivoSinCredito).toBe('fuera_de_plazo');
    expect(documento.avisos).toHaveLength(1);
    expect(documento.lineas.every((linea) => linea.ivaNoAcreditable === linea.iva && linea.iva > 0)).toBe(true);
    expect(documento.totales.ivaNoAcreditable).toBe(documento.totales.iva);
  });

  it('fuera de plazo en otro año avisa que el año puede estar cerrado', () => {
    const documento = calcularDocumento(
      datos({ fechaDeEmision: '2025-11-10', fechaDeRecepcion: '2026-02-02', periodo: '2026-02-01' }),
    );
    expect(documento.motivoSinCredito).toBe('fuera_de_plazo');
    expect(documento.avisos).toHaveLength(2);
    expect(documento.avisos[1]).toMatch(/año/);
  });

  it('no vinculado manda sobre fuera de plazo y lleva el IVA al costo', () => {
    const documento = calcularDocumento(
      datos({ noVinculado: true, periodo: '2026-04-01', fechaDeRecepcion: '2026-04-05' }),
    );
    expect(documento.motivoSinCredito).toBe('no_vinculado');
    expect(documento.avisos).toEqual([]);
    expect(documento.totales.ivaNoAcreditable).toBe(1200);
  });

  it('todo exento con IVA cero: motivo exento, sin IVA al costo', () => {
    const documento = calcularDocumento(datos({ lineas: [{ total: 5000, exento: 5000 }], noVinculado: true }));
    expect(documento.motivoSinCredito).toBe('exento');
    expect(documento.totales).toMatchObject({ iva: 0, base: 0, ivaNoAcreditable: 0, exento: 5000 });
  });

  it('un documento con IDP y gravado no es exento aunque tenga algo exento', () => {
    expect(calcularDocumento(datos({ lineas: [{ total: 16200, exento: 5000 }] })).motivoSinCredito).toBeNull();
  });

  it('con combustible separa IDP, base e IVA', () => {
    const documento = calcularDocumento(
      datos({
        lineas: [
          { total: 100000, exento: 0, combustible: { galones: '100', idpPorGalon: '4.70', porcentajeDeEtanol: '10' } },
        ],
      }),
    );
    expect(documento.totales).toMatchObject({ idp: 42300, base: 51518, iva: 6182 });
  });
});

describe('calcularDocumento: sin IVA', () => {
  it('factura de pequeño contribuyente: IVA cero y motivo propio', () => {
    const documento = calcularDocumento(datos({ tipo: 'factura_pequeno_contribuyente' }));
    expect(documento.motivoSinCredito).toBe('pequeno_contribuyente');
    expect(documento.totales).toMatchObject({ iva: 0, base: 11200 });
  });

  it('casilla SAT desmarcada: todo al costo, sin motivo ni avisos aunque pase del plazo', () => {
    const documento = calcularDocumento(
      datos({ muestraEnReportesSat: false, noVinculado: true, periodo: '2026-09-01', fechaDeRecepcion: '2026-09-02' }),
    );
    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.avisos).toEqual([]);
    expect(documento.totales).toMatchObject({ iva: 0, base: 11200, ivaNoAcreditable: 0 });
  });

  it('el recibo (casilla desmarcada) no lleva IVA', () => {
    expect(calcularDocumento(datos({ tipo: 'recibo', muestraEnReportesSat: false })).totales.iva).toBe(0);
  });
});

describe('calcularDocumento: nota de crédito', () => {
  it('va en el mes en que se recibe, aunque su factura sea vieja, sin motivo si la factura dio crédito', () => {
    const documento = calcularDocumento(nota({ fechaDeEmision: '2026-05-02', motivoDeLaFactura: null }));
    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.totales.iva).toBe(1200);
  });

  it('una nota recibida fuera del plazo de su propia emisión no se marca fuera de plazo si su factura dio crédito', () => {
    const documento = calcularDocumento(nota({ fechaDeEmision: '2026-01-15', motivoDeLaFactura: null }));
    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.avisos).toEqual([]);
  });

  it('hereda no_vinculado y rebaja el costo', () => {
    const documento = calcularDocumento(nota({ motivoDeLaFactura: 'no_vinculado' }));
    expect(documento.motivoSinCredito).toBe('no_vinculado');
    expect(documento.totales.ivaNoAcreditable).toBe(1200);
  });

  it('la factura fuera de plazo pasa a la nota como no_vinculado si la nota es reciente (los check lo exigen)', () => {
    expect(calcularDocumento(nota({ motivoDeLaFactura: 'fuera_de_plazo' })).motivoSinCredito).toBe('no_vinculado');
  });

  it('la factura fuera de plazo pasa tal cual si la propia nota está fuera de plazo', () => {
    const documento = calcularDocumento(nota({ fechaDeEmision: '2026-01-15', motivoDeLaFactura: 'fuera_de_plazo' }));
    expect(documento.motivoSinCredito).toBe('fuera_de_plazo');
    expect(documento.avisos).toEqual([]);
  });

  it('la nota de una factura de pequeño contribuyente no lleva IVA', () => {
    const documento = calcularDocumento(nota({ motivoDeLaFactura: 'pequeno_contribuyente' }));
    expect(documento.motivoSinCredito).toBe('pequeno_contribuyente');
    expect(documento.totales.iva).toBe(0);
  });

  it('la nota de una factura exenta es exenta solo si no trae IVA', () => {
    const exenta = calcularDocumento(nota({ motivoDeLaFactura: 'exento', lineas: [{ total: 5000, exento: 5000 }] }));
    expect(exenta.motivoSinCredito).toBe('exento');
    expect(calcularDocumento(nota({ motivoDeLaFactura: 'exento' })).motivoSinCredito).toBe('no_vinculado');
  });

  it('rechaza una nota que no va en su mes de recepción', () => {
    expect(() => calcularDocumento(nota({ periodo: '2026-06-01' }))).toThrow(PeriodoInvalido);
  });
});

describe('determinarMotivoSinCredito: orden de las reglas', () => {
  const base = {
    tipo: 'factura' as const,
    muestraEnReportesSat: true,
    noVinculado: true,
    total: 5000,
    exento: 5000,
    iva: 0,
    periodo: '2026-09-01',
    fechaDeEmision: '2026-01-01',
  };

  it('pequeño contribuyente manda sobre exento y no vinculado', () => {
    expect(determinarMotivoSinCredito({ ...base, tipo: 'factura_pequeno_contribuyente' }).motivo).toBe(
      'pequeno_contribuyente',
    );
  });

  it('exento manda sobre no vinculado y fuera de plazo', () => {
    expect(determinarMotivoSinCredito(base).motivo).toBe('exento');
  });

  it('no vinculado manda sobre fuera de plazo', () => {
    expect(determinarMotivoSinCredito({ ...base, iva: 100, exento: 0 }).motivo).toBe('no_vinculado');
  });

  it('desmarcada la casilla SAT no hay motivo', () => {
    expect(determinarMotivoSinCredito({ ...base, muestraEnReportesSat: false }).motivo).toBeNull();
  });
});
