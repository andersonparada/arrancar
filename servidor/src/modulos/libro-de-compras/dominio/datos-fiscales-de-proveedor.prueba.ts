import { describe, expect, it } from 'vitest';
import {
  DatosFiscalesDeProveedor,
  REGIMENES_DE_IVA_DE_PROVEEDOR,
  retencionesPropuestas,
  type RegimenDeIvaDeProveedor,
} from './datos-fiscales-de-proveedor.js';
import { exigirTipoDelProveedor } from './reglas-del-encabezado.js';

const SIN_RETENCIONES = {
  esAgenteDeRetencionIva: false,
  seLeRetieneIva: false,
  seLeRetieneIsr: false,
  seLeRetieneIvaPequenoContribuyente: false,
};

describe('datos fiscales del proveedor: valores por omisión según el régimen de IVA', () => {
  const especialesSinRetencion: RegimenDeIvaDeProveedor[] = [
    'primario',
    'pecuario',
    'sin_inscripcion',
    'pequeno_contribuyente_electronico',
    'contribuyente_agropecuario',
  ];

  it.each(especialesSinRetencion)('%s: ISR «no aplica» y no se le retiene nada', (regimenIva) => {
    const datos = DatosFiscalesDeProveedor.porOmision({
      regimenIva,
      regimenIsr: 'exento',
      esAgenteDeRetencionIva: true,
    });

    expect(datos.instantanea()).toEqual({ regimenIva, regimenIsr: null, ...SIN_RETENCIONES });
  });

  it('el pequeño contribuyente es el único al que se le retiene el 5 %', () => {
    for (const regimenIva of REGIMENES_DE_IVA_DE_PROVEEDOR) {
      const propiedades = DatosFiscalesDeProveedor.porOmision({ regimenIva }).instantanea();
      expect(propiedades.seLeRetieneIvaPequenoContribuyente).toBe(regimenIva === 'pequeno_contribuyente');
    }
  });

  it('el no domiciliado lleva su régimen de ISR forzado y no se le retiene ISR (se avisa)', () => {
    const datos = DatosFiscalesDeProveedor.porOmision({ regimenIva: 'no_domiciliado', regimenIsr: 'utilidades' });

    expect(datos.instantanea()).toEqual({
      regimenIva: 'no_domiciliado',
      regimenIsr: 'no_domiciliado',
      ...SIN_RETENCIONES,
    });
  });

  it('el general exento de ISR no propone retener ISR; el opcional simplificado sí', () => {
    const exento = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'exento' }).instantanea();
    const opcional = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'opcional_simplificado' }).instantanea();

    expect(exento).toMatchObject({ regimenIsr: 'exento', seLeRetieneIsr: false, seLeRetieneIva: true });
    expect(opcional.seLeRetieneIsr).toBe(true);
  });
});

describe('retenciones propuestas por régimen de IVA', () => {
  it('solo el general que no es agente sufre la retención del IVA general', () => {
    const base = { regimenIsr: null, esAgenteDeRetencionIva: false } as const;
    const agente = { ...base, esAgenteDeRetencionIva: true };

    expect(retencionesPropuestas({ ...base, regimenIva: 'general' }).seLeRetieneIva).toBe(true);
    expect(retencionesPropuestas({ ...base, regimenIva: 'primario' }).seLeRetieneIva).toBe(false);
    expect(retencionesPropuestas({ ...agente, regimenIva: 'general' }).seLeRetieneIva).toBe(false);
  });
});

describe('tipo de factura contra régimen de IVA del proveedor', () => {
  it('cada tipo existente corresponde a su régimen', () => {
    expect(exigirTipoDelProveedor('factura', 'general')).toBe(false);
    expect(exigirTipoDelProveedor('factura_pequeno_contribuyente', 'pequeno_contribuyente')).toBe(false);
    expect(exigirTipoDelProveedor('nota_de_credito', 'primario')).toBe(false);
    expect(exigirTipoDelProveedor('recibo', 'sin_inscripcion')).toBe(false);
  });

  it('una factura normal de un régimen especial pide confirmar el cambio de régimen', () => {
    expect(() => exigirTipoDelProveedor('factura', 'primario')).toThrow();
    expect(() => exigirTipoDelProveedor('factura', 'pequeno_contribuyente')).toThrow();
    expect(() => exigirTipoDelProveedor('factura_pequeno_contribuyente', 'general')).toThrow();
    expect(exigirTipoDelProveedor('factura', 'primario', true)).toBe(true);
  });
});
