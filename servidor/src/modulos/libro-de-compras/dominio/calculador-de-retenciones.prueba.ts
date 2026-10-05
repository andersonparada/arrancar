import { describe, expect, it } from 'vitest';
import { configuracionDelLibroDeCompras } from '../configuracion.js';
import { calcularDocumento } from './calculo-de-documento.js';
import type { LineaEscrita } from './calculo-de-linea.js';
import { calcularRetenciones } from './calculador-de-retenciones.js';
import { configuracionDeRetenciones } from './configuracion-de-retenciones.js';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor, type BaseFiscalDeProveedor } from './datos-fiscales-de-proveedor.js';
import type { ConfiguracionDeRetenciones, EntradaDeRetenciones } from './retencion-propuesta.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

const predeterminados = new Map(
  configuracionDelLibroDeCompras.map((c) => [c.clave, c.predeterminado as number | boolean]),
);
const configuracion = (cambios: Partial<ConfiguracionDeRetenciones> = {}): ConfiguracionDeRetenciones => ({
  ...configuracionDeRetenciones((clave) => predeterminados.get(clave) as number | boolean),
  ...cambios,
});

const empresa = (cambios: Partial<PropiedadesFiscalesDeEmpresa> = {}): DatosFiscalesDeEmpresa =>
  DatosFiscalesDeEmpresa.crear({ ...DatosFiscalesDeEmpresa.porOmision().instantanea(), ...cambios });

interface Caso {
  total: number;
  exento?: number;
  idp?: number;
  tipo?: TipoDeDocumento;
  casilla?: boolean;
  empresa?: Partial<PropiedadesFiscalesDeEmpresa>;
  proveedor?: Partial<BaseFiscalDeProveedor>;
  config?: Partial<ConfiguracionDeRetenciones>;
  lineas?: LineaEscrita[];
  agropecuarias?: boolean[];
}

/** Arma la entrada; `idp` se simula con combustible a Q1.00 por galón (1 galón = Q1.00 de IDP). */
function entrada(caso: Caso): EntradaDeRetenciones {
  const tipo = caso.tipo ?? 'factura';
  const lineas: LineaEscrita[] = caso.lineas ?? [
    {
      total: caso.total,
      exento: caso.exento ?? 0,
      combustible: caso.idp ? { galones: String(caso.idp / 100), idpPorGalon: '1.00', porcentajeDeEtanol: '0' } : null,
    },
  ];
  const documento = calcularDocumento({
    tipo,
    muestraEnReportesSat: caso.casilla ?? true,
    noVinculado: false,
    fechaDeEmision: '2026-01-15',
    fechaDeRecepcion: '2026-01-20',
    periodo: '2026-01-01',
    lineas,
    tasaDeIva: 1200,
    mesActual: '2026-01-01',
  });
  return {
    tipo,
    muestraEnReportesSat: caso.casilla ?? true,
    documento,
    lineasAgropecuarias: caso.agropecuarias ?? lineas.map(() => false),
    empresa: empresa(caso.empresa),
    proveedor: DatosFiscalesDeProveedor.porOmision(caso.proveedor),
    configuracion: configuracion(caso.config),
  };
}

const montos = (caso: Caso): Array<[string, number, number]> =>
  calcularRetenciones(entrada(caso)).map((r) => [r.regla, r.base, r.montoPropuesto]);

describe('IVA de agentes: mínimo con >= sobre el total', () => {
  const especial = { agenteDeRetencionIva: 'contribuyente_especial' } as const;
  it.each([
    ['Q2,499.99 no retiene', 249999, []],
    ['Q2,500.00 sí retiene', 250000, [['iva_contribuyente_especial', 26786, 4018]]],
    ['Q2,500.01 sí retiene', 250001, [['iva_contribuyente_especial', 26786, 4018]]],
  ])('contribuyente especial: %s', (_nombre, total, esperado) => {
    expect(montos({ total, empresa: especial })).toEqual(esperado);
  });

  it('agente «otro» retiene el 15 % del IVA', () => {
    expect(montos({ total: 11200 * 25, empresa: { agenteDeRetencionIva: 'otro' } })).toEqual([
      ['iva_otro_agente', 30000, 4500],
    ]);
  });

  it('no retiene si el proveedor es agente o no es sujeto', () => {
    expect(montos({ total: 300000, empresa: especial, proveedor: { esAgenteDeRetencionIva: true } })).toEqual([]);
  });

  it('retiene aunque la factura no dé crédito fiscal (fuera de plazo)', () => {
    const base = entrada({ total: 300000, empresa: especial });
    const fueraDePlazo = calcularDocumento({
      tipo: 'factura',
      muestraEnReportesSat: true,
      noVinculado: false,
      fechaDeEmision: '2026-01-15',
      fechaDeRecepcion: '2026-06-01',
      periodo: '2026-06-01',
      lineas: [{ total: 300000, exento: 0 }],
      tasaDeIva: 1200,
      mesActual: '2026-01-01',
    });
    expect(fueraDePlazo.motivoSinCredito).toBe('fuera_de_plazo');
    expect(calcularRetenciones({ ...base, documento: fueraDePlazo })).toHaveLength(1);
  });

  it('una factura toda exenta (sin IVA) no genera propuesta', () => {
    expect(montos({ total: 300000, exento: 300000, empresa: especial })).toEqual([]);
  });
});

describe('IVA del exportador', () => {
  const exportador = { agenteDeRetencionIva: 'exportador' } as const;
  it('retiene 65 % de lo agropecuario y 15 % de lo demás, cada uno con su base', () => {
    const lineas = [
      { total: 112000, exento: 0 },
      { total: 224000, exento: 0 },
    ];
    expect(montos({ total: 0, lineas, agropecuarias: [true, false], empresa: exportador })).toEqual([
      ['iva_exportador_agropecuario', 12000, 7800],
      ['iva_exportador', 24000, 3600],
    ]);
  });

  it('todo agropecuario: solo la regla agropecuaria', () => {
    expect(montos({ total: 1120000, agropecuarias: [true], empresa: exportador })).toEqual([
      ['iva_exportador_agropecuario', 120000, 78000],
    ]);
  });

  it('el mínimo se mide sobre el total del documento: Q2,499.99 no, Q2,500.00 sí', () => {
    expect(montos({ total: 249999, agropecuarias: [true], empresa: exportador })).toEqual([]);
    expect(montos({ total: 250000, agropecuarias: [true], empresa: exportador })).toHaveLength(1);
  });
});

describe('IVA del sector público: mínimo propio de Q30,000.00', () => {
  const publico = { agenteDeRetencionIva: 'sector_publico' } as const;
  it('Q29,999.99 no; Q30,000.00 y Q30,000.01 sí, al 25 %', () => {
    expect(montos({ total: 2999999, empresa: publico })).toEqual([]);
    expect(montos({ total: 3000000, empresa: publico })).toEqual([['iva_sector_publico', 321429, 80357]]);
    expect(montos({ total: 3000001, empresa: publico })).toHaveLength(1);
  });
});

describe('IVA de pequeño contribuyente: el total debe ser mayor al umbral', () => {
  const agente = { agenteDeRetencionIva: 'otro' } as const;
  const pequeno = { esPequenoContribuyente: true } as const;
  it.each([
    ['Q2,499.99', 249999, []],
    ['Q2,500.00 exactos', 250000, []],
    ['Q2,500.01', 250001, [['iva_pequeno_contribuyente', 250001, 12500]]],
  ])('%s', (_nombre, total, esperado) => {
    expect(montos({ total, tipo: 'factura_pequeno_contribuyente', empresa: agente, proveedor: pequeno })).toEqual(
      esperado,
    );
  });

  it('la fecha la pone el destino', () => {
    const [retencion] = calcularRetenciones(
      entrada({ total: 500000, tipo: 'factura_pequeno_contribuyente', empresa: agente, proveedor: pequeno }),
    );
    expect(retencion).toMatchObject({ porcentaje: 500, origenDeLaFecha: 'destino' });
  });

  it('una empresa que no es agente no retiene', () => {
    expect(montos({ total: 500000, tipo: 'factura_pequeno_contribuyente', proveedor: pequeno })).toEqual([]);
  });
});

describe('ISR del régimen opcional simplificado', () => {
  const agenteIsr = { esAgenteDeRetencionIsr: true };
  const opcional = { regimenIsr: 'opcional_simplificado' } as const;
  const isr = (caso: Caso) => montos({ empresa: agenteIsr, proveedor: opcional, ...caso });

  it.each([
    ['Q2,499.99', 249999, []],
    ['Q2,500.00 (>=)', 250000, [['isr_opcional_simplificado', 250000, 12500]]],
    ['Q2,500.01', 250001, [['isr_opcional_simplificado', 250001, 12500]]],
  ])('mínimo de la base sin IVA: %s', (_nombre, base, esperado) => {
    expect(isr({ total: base, exento: base })).toEqual(esperado);
  });

  it('escalón exacto de Q30,000: 5 % y nada de excedente', () => {
    expect(isr({ total: 3000000, exento: 3000000 })).toEqual([['isr_opcional_simplificado', 3000000, 150000]]);
  });

  it('un centavo sobre el escalón: 7 % del excedente, redondeado', () => {
    expect(isr({ total: 3000001, exento: 3000001 })).toEqual([['isr_opcional_simplificado', 3000001, 150000]]);
    expect(isr({ total: 3000050, exento: 3000050 })).toEqual([['isr_opcional_simplificado', 3000050, 150004]]);
  });

  it('Q50,000: 1,500 + 7 % de 20,000 = 2,900', () => {
    expect(isr({ total: 5000000, exento: 5000000 })).toEqual([['isr_opcional_simplificado', 5000000, 290000]]);
  });

  it('lo exento va dentro de la base: total menos IVA', () => {
    expect(isr({ total: 2240000, exento: 1000000 })).toEqual([['isr_opcional_simplificado', 2107143, 105357]]);
  });

  it('IDP dentro de la base (por omisión) y fuera de ella', () => {
    const combustible = { total: 560000, idp: 100000 };
    const dentro = calcularRetenciones(entrada({ ...combustible, empresa: agenteIsr, proveedor: opcional }))[0];
    const fuera = calcularRetenciones(
      entrada({ ...combustible, empresa: agenteIsr, proveedor: opcional, config: { incluyeIdpEnBaseIsr: false } }),
    )[0];
    expect(dentro?.base).toBe(510714);
    expect(fuera?.base).toBe(410714);
  });

  it('sin ser agente de ISR o sin que se le retenga, nada', () => {
    expect(isr({ total: 500000, empresa: { esAgenteDeRetencionIsr: false } })).toEqual([]);
    expect(montos({ total: 500000, empresa: agenteIsr, proveedor: { regimenIsr: 'utilidades' } })).toEqual([]);
  });

  it('tiene porcentaje nulo (escalones)', () => {
    const [retencion] = calcularRetenciones(entrada({ total: 500000, empresa: agenteIsr, proveedor: opcional }));
    expect(retencion).toMatchObject({ impuesto: 'isr', porcentaje: null, origenDeLaFecha: 'emision' });
  });
});

describe('casos que nunca retienen', () => {
  const todo = {
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  } as const;

  it('casilla SAT desmarcada: ninguna retención', () => {
    expect(montos({ total: 500000, casilla: false, empresa: todo })).toEqual([]);
  });

  it('nota de crédito: ninguna retención', () => {
    expect(montos({ total: 500000, tipo: 'nota_de_credito', empresa: todo })).toEqual([]);
  });

  it('con los dos impuestos a la vez, devuelve ambas, y cumplen los check de la tabla', () => {
    const retenciones = calcularRetenciones(
      entrada({ total: 500000, empresa: todo, proveedor: { regimenIsr: 'opcional_simplificado' } }),
    );
    expect(retenciones.map((r) => r.regla)).toEqual(['iva_contribuyente_especial', 'isr_opcional_simplificado']);
    for (const r of retenciones) {
      expect(r.base).toBeGreaterThan(0);
      expect(r.montoPropuesto).toBeGreaterThanOrEqual(0);
      expect(r.montoPropuesto).toBeLessThanOrEqual(r.base);
      expect(r.impuesto).toBe(r.regla.split('_')[0]);
    }
  });
});

describe('configuracionDeRetenciones', () => {
  it('convierte porcentajes en centésimas y quetzales en centavos', () => {
    expect(configuracion()).toMatchObject({
      porcentajeExportadorAgropecuario: 6500,
      porcentajePequenoContribuyente: 500,
      minimoIva: 250000,
      minimoSectorPublico: 3000000,
      limitePrimerTramoIsr: 3000000,
      incluyeIdpEnBaseIsr: true,
    });
  });
});
