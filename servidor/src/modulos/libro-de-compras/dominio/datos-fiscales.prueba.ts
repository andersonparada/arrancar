import { describe, expect, it } from 'vitest';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor, type PropiedadesFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import { DatosFiscalesInvalidos } from './errores.js';

const proveedor = (cambios: Partial<PropiedadesFiscalesDeProveedor> = {}): PropiedadesFiscalesDeProveedor => ({
  ...DatosFiscalesDeProveedor.porOmision().instantanea(),
  ...cambios,
});

describe('datos fiscales de la empresa', () => {
  it('sin datos guardados: régimen general, sobre utilidades y sin agentes de retención', () => {
    expect(DatosFiscalesDeEmpresa.porOmision().instantanea()).toEqual({
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: false,
    });
  });

  it('una empresa general puede ser agente de retención', () => {
    const datos = DatosFiscalesDeEmpresa.crear({
      regimenIva: 'general',
      regimenIsr: 'opcional_simplificado',
      agenteDeRetencionIva: 'exportador',
      esAgenteDeRetencionIsr: true,
    });

    expect(datos.instantanea()).toMatchObject({ agenteDeRetencionIva: 'exportador', esAgenteDeRetencionIsr: true });
  });

  it('un pequeño contribuyente no puede ser agente de retención del IVA', () => {
    const crear = () =>
      DatosFiscalesDeEmpresa.crear({
        regimenIva: 'pequeno_contribuyente',
        regimenIsr: 'utilidades',
        agenteDeRetencionIva: 'contribuyente_especial',
        esAgenteDeRetencionIsr: false,
      });

    expect(crear).toThrow(DatosFiscalesInvalidos);
  });

  it('sabe si dos datos son iguales', () => {
    const base = DatosFiscalesDeEmpresa.porOmision();
    const otros = DatosFiscalesDeEmpresa.crear({ ...base.instantanea(), esAgenteDeRetencionIsr: true });

    expect(base.esIgualA(DatosFiscalesDeEmpresa.porOmision())).toBe(true);
    expect(base.esIgualA(otros)).toBe(false);
  });
});

describe('datos fiscales del proveedor: valores por omisión', () => {
  it('sin datos: sobre utilidades, se le retiene el IVA y no el ISR', () => {
    expect(DatosFiscalesDeProveedor.porOmision().instantanea()).toEqual({
      esPequenoContribuyente: false,
      regimenIsr: 'utilidades',
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: true,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: false,
    });
  });

  it('el régimen opcional simplificado propone retener el ISR', () => {
    const datos = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'opcional_simplificado' });

    expect(datos.instantanea()).toMatchObject({ seLeRetieneIsr: true, seLeRetieneIva: true });
  });

  it('un agente de retención no sufre la retención del IVA (entre agentes no se retiene)', () => {
    const datos = DatosFiscalesDeProveedor.porOmision({ esAgenteDeRetencionIva: true });

    expect(datos.instantanea().seLeRetieneIva).toBe(false);
  });

  it('un pequeño contribuyente no tiene régimen de ISR y se le retiene el IVA de pequeño contribuyente', () => {
    const datos = DatosFiscalesDeProveedor.porOmision({ esPequenoContribuyente: true, regimenIsr: 'utilidades' });

    expect(datos.instantanea()).toEqual({
      esPequenoContribuyente: true,
      regimenIsr: null,
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: false,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: true,
    });
  });
});

describe('datos fiscales del proveedor: coherencia', () => {
  const campos = (cambios: Partial<PropiedadesFiscalesDeProveedor>) => {
    try {
      DatosFiscalesDeProveedor.crear(proveedor(cambios));
      return [];
    } catch (error) {
      return (error as DatosFiscalesInvalidos).problemas.map((problema) => problema.campo);
    }
  };

  it('el usuario manda dentro del régimen: puede no retener a un exento por resolución de la SAT', () => {
    expect(campos({ seLeRetieneIva: false })).toEqual([]);
    expect(campos({ seLeRetieneIsr: true })).toEqual([]);
  });

  it('un pequeño contribuyente no lleva régimen de ISR, ni es agente, ni sufre retención general', () => {
    const pequeno = { esPequenoContribuyente: true, regimenIsr: null, seLeRetieneIva: false };

    expect(campos({ ...pequeno, regimenIsr: 'utilidades' })).toEqual(['regimenIsr']);
    expect(campos({ ...pequeno, esAgenteDeRetencionIva: true })).toEqual(['esAgenteDeRetencionIva']);
    expect(campos({ ...pequeno, seLeRetieneIva: true })).toEqual(['seLeRetieneIva']);
    expect(campos({ ...pequeno, seLeRetieneIsr: true })).toEqual(['seLeRetieneIsr']);
  });

  it('quien no es pequeño contribuyente necesita un régimen de ISR y no sufre la retención del 5 %', () => {
    expect(campos({ regimenIsr: null })).toEqual(['regimenIsr']);
    expect(campos({ seLeRetieneIvaPequenoContribuyente: true })).toEqual(['seLeRetieneIvaPequenoContribuyente']);
  });

  it('un no domiciliado es un régimen válido', () => {
    expect(campos({ regimenIsr: 'no_domiciliado' })).toEqual([]);
  });
});
