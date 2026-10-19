import { describe, expect, it } from 'vitest';
import {
  DatosFiscalesDeEmpresa,
  problemasFiscalesDeEmpresa,
  type PropiedadesFiscalesDeEmpresa,
} from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor, type PropiedadesFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import { DatosFiscalesInvalidos } from './errores.js';

const proveedor = (cambios: Partial<PropiedadesFiscalesDeProveedor> = {}): PropiedadesFiscalesDeProveedor => ({
  ...DatosFiscalesDeProveedor.porOmision().instantanea(),
  ...cambios,
});

const empresa = (cambios: Partial<PropiedadesFiscalesDeEmpresa> = {}): PropiedadesFiscalesDeEmpresa => ({
  ...DatosFiscalesDeEmpresa.porOmision().instantanea(),
  ...cambios,
});

const sinISr = { regimenIsr: null, esAgenteDeRetencionIsr: false } as const;

describe('datos fiscales de la empresa', () => {
  it('una empresa general puede ser agente de retención', () => {
    const datos = DatosFiscalesDeEmpresa.crear(
      empresa({ regimenIsr: 'opcional_simplificado', agenteDeRetencionIva: 'exportador' }),
    );

    expect(datos.instantanea()).toMatchObject({ agenteDeRetencionIva: 'exportador', esAgenteDeRetencionIsr: true });
  });

  it.each([
    'pequeno_contribuyente',
    'pequeno_contribuyente_electronico',
    'contribuyente_agropecuario',
    'primario_pecuario',
  ] as const)('con %s no puede ser agente de retención del IVA', (regimenIva) => {
    const crear = () =>
      DatosFiscalesDeEmpresa.crear(
        empresa({ regimenIva, ...sinISr, tipoDePersona: 'individual', agenteDeRetencionIva: 'otro' }),
      );

    expect(crear).toThrow(DatosFiscalesInvalidos);
  });

  it('con el régimen general o no afiliado el ISR es obligatorio; con los demás no aplica', () => {
    const problemas = (cambios: Partial<PropiedadesFiscalesDeEmpresa>) => problemasFiscalesDeEmpresa(empresa(cambios));

    expect(problemas({ regimenIsr: null })).toEqual([expect.objectContaining({ campo: 'regimenIsr' })]);
    expect(problemas({ regimenIva: 'no_afiliado', regimenIsr: null })).toHaveLength(1);
    expect(problemas({ regimenIva: 'primario_pecuario', regimenIsr: 'utilidades' })).toHaveLength(1);
    expect(problemas({ regimenIva: 'pequeno_contribuyente', ...sinISr })).toEqual([]);
  });

  it('solo una persona jurídica puede estar exenta del ISR', () => {
    const exenta = (tipoDePersona: 'individual' | 'juridica') =>
      problemasFiscalesDeEmpresa(empresa({ regimenIva: 'no_afiliado', regimenIsr: 'exento', tipoDePersona }));

    expect(exenta('juridica')).toEqual([]);
    expect(exenta('individual')).toEqual([expect.objectContaining({ campo: 'regimenIsr' })]);
  });

  it('el contribuyente agropecuario solo puede ser persona individual', () => {
    const agropecuario = (tipoDePersona: 'individual' | 'juridica') =>
      problemasFiscalesDeEmpresa(empresa({ regimenIva: 'contribuyente_agropecuario', ...sinISr, tipoDePersona }));

    expect(agropecuario('individual')).toEqual([]);
    expect(agropecuario('juridica')).toEqual([expect.objectContaining({ campo: 'tipoDePersona' })]);
  });

  it('el primario y pecuario admite personas individuales y jurídicas', () => {
    for (const tipoDePersona of ['individual', 'juridica'] as const) {
      const datos = empresa({ regimenIva: 'primario_pecuario', ...sinISr, tipoDePersona });

      expect(problemasFiscalesDeEmpresa(datos)).toEqual([]);
    }
  });

  it('da crédito fiscal solo en el régimen general', () => {
    const da = (cambios: Partial<PropiedadesFiscalesDeEmpresa>) =>
      DatosFiscalesDeEmpresa.crear(empresa(cambios)).daCreditoFiscal();

    expect(da({})).toBe(true);
    expect(da({ regimenIva: 'no_afiliado', regimenIsr: 'exento' })).toBe(false);
    expect(da({ regimenIva: 'pequeno_contribuyente', ...sinISr })).toBe(false);
  });

  it('tiene ISR sobre utilidades solo con ese régimen', () => {
    const tiene = (regimenIsr: PropiedadesFiscalesDeEmpresa['regimenIsr']) =>
      DatosFiscalesDeEmpresa.crear(empresa({ regimenIsr })).tieneIsrSobreUtilidades();

    expect(tiene('utilidades')).toBe(true);
    expect(tiene('opcional_simplificado')).toBe(false);
    expect(tiene('exento')).toBe(false);
  });

  it('sabe si dos datos son iguales y si tienen los mismos datos fiscales (sin contar la persona)', () => {
    const base = DatosFiscalesDeEmpresa.porOmision();
    const otros = DatosFiscalesDeEmpresa.crear(empresa({ esAgenteDeRetencionIsr: false }));
    const individual = base.conTipoDePersona('individual');

    expect(base.esIgualA(DatosFiscalesDeEmpresa.porOmision())).toBe(true);
    expect(base.esIgualA(otros)).toBe(false);
    expect(base.esIgualA(individual)).toBe(false);
    expect(base.tieneLosMismosDatosFiscalesQue(individual)).toBe(true);
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
