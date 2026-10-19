import { describe, expect, it } from 'vitest';
import type {
  DatosFiscalesDeEmpresa,
  DatosFiscalesDeProveedor,
  VigenciaFiscal,
} from '../servicios/libro-de-compras.api';
import {
  conRegimenDeIsr,
  conRegimenDeIva,
  conTipoDePersona,
  contextoFiscalDe,
  contextoSinGuardar,
  detallesDeEmpresa,
  fiscalesDeEmpresaDesde,
  fiscalesDeEmpresaPorOmision,
  haceFaltaPreguntarLaContabilidad,
} from './datos-fiscales-de-empresa';
import {
  conCambioDeRegimen,
  detallesDeProveedor,
  fiscalesDeProveedorDesde,
  fiscalesDeProveedorPorOmision,
  retencionesPropuestas,
  retencionesSonLasPropuestas,
} from './datos-fiscales-de-proveedor';

const dtoDeEmpresa = (cambios: Partial<DatosFiscalesDeEmpresa> = {}): DatosFiscalesDeEmpresa => ({
  empresaId: 'e1',
  guardado: true,
  vigenteDesde: null,
  tipoDePersona: 'juridica',
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
  historial: [],
  ...cambios,
});

describe('datos fiscales de la empresa', () => {
  it('una empresa nueva no tiene tipo de persona supuesto ni vigencia escogida', () => {
    expect(fiscalesDeEmpresaPorOmision()).toMatchObject({
      tipoDePersona: null,
      regimenIva: 'general',
      vigenteDesde: undefined,
    });
  });

  it('al pasar del servidor al formulario deja fuera el historial y no manda vigencia', () => {
    const formulario = fiscalesDeEmpresaDesde(dtoDeEmpresa({ vigenteDesde: '2026-03-01' }));
    expect(formulario).toEqual({
      tipoDePersona: 'juridica',
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
      vigenteDesde: undefined,
    });
  });

  it('fuera del régimen general quita el agente de IVA y el ISR no aplica', () => {
    const agente = { ...fiscalesDeEmpresaPorOmision(), agenteDeRetencionIva: 'exportador' as const };
    const pequeno = conRegimenDeIva(agente, 'pequeno_contribuyente');
    expect(pequeno.agenteDeRetencionIva).toBe('ninguno');
    expect(pequeno.regimenIsr).toBeNull();
    expect(conRegimenDeIva(agente, 'general').agenteDeRetencionIva).toBe('exportador');
  });

  it('al escoger la persona aplica la propuesta', () => {
    const individual = conRegimenDeIva(
      conTipoDePersona(fiscalesDeEmpresaPorOmision(), 'individual'),
      'primario_pecuario',
    );
    expect(individual).toMatchObject({ regimenIsr: null, esAgenteDeRetencionIsr: false });
    expect(conTipoDePersona(individual, 'juridica').esAgenteDeRetencionIsr).toBe(true);
  });

  it('persona individual en el opcional simplificado: hay que preguntar si lleva contabilidad', () => {
    const base = conTipoDePersona(fiscalesDeEmpresaPorOmision(), 'individual');
    expect(haceFaltaPreguntarLaContabilidad(base)).toBe(false);
    const simplificado = conRegimenDeIsr(base, 'opcional_simplificado');
    expect(simplificado.esAgenteDeRetencionIsr).toBeUndefined();
    expect(haceFaltaPreguntarLaContabilidad(simplificado)).toBe(true);
  });

  it('una persona individual no queda exenta: al cambiar de jurídica a individual vuelve a utilidades', () => {
    const exenta = conRegimenDeIsr(conTipoDePersona(fiscalesDeEmpresaPorOmision(), 'juridica'), 'exento');
    expect(exenta.regimenIsr).toBe('exento');
    expect(conTipoDePersona(exenta, 'individual').regimenIsr).toBe('utilidades');
  });

  it('el contexto dice si ya había datos y si lo que rige hoy tiene facturas', () => {
    const vigencia = { vigenteHasta: null, conDocumentos: true } as VigenciaFiscal;
    expect(contextoFiscalDe(dtoDeEmpresa({ historial: [vigencia] }))).toEqual({ guardado: true, hayFacturasHoy: true });
    expect(contextoFiscalDe(dtoDeEmpresa({ guardado: false })).hayFacturasHoy).toBe(false);
    expect(contextoSinGuardar().guardado).toBe(false);
  });

  it('la ficha usa nombres legibles', () => {
    const detalles = detallesDeEmpresa(fiscalesDeEmpresaDesde(dtoDeEmpresa()));
    expect(detalles.map((d) => d.valor)).toEqual([
      'Persona jurídica (sociedad, asociación…)',
      'General',
      'Sobre las utilidades',
      'Ninguno',
      'Sí',
    ]);
  });

  it('en la ficha, sin ISR dice que no aplica', () => {
    const pequeno = fiscalesDeEmpresaDesde(dtoDeEmpresa({ regimenIva: 'pequeno_contribuyente', regimenIsr: null }));
    expect(detallesDeEmpresa(pequeno)[2]?.valor).toBe('No aplica');
  });
});

describe('datos fiscales del proveedor', () => {
  it('sin datos guardados se le retiene el IVA y no el ISR', () => {
    expect(fiscalesDeProveedorPorOmision()).toEqual({
      esPequenoContribuyente: false,
      regimenIsr: 'utilidades',
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: true,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: false,
    });
  });

  it('propone las retenciones según el régimen', () => {
    const base = {
      esPequenoContribuyente: false,
      esAgenteDeRetencionIva: true,
      regimenIsr: 'opcional_simplificado' as const,
    };
    expect(retencionesPropuestas(base)).toEqual({
      seLeRetieneIva: false,
      seLeRetieneIsr: true,
      seLeRetieneIvaPequenoContribuyente: false,
    });
  });

  it('al ser pequeño contribuyente quita el régimen de ISR y el agente, y propone su retención', () => {
    const agente = { ...fiscalesDeProveedorPorOmision(), esAgenteDeRetencionIva: true, seLeRetieneIva: false };
    expect(conCambioDeRegimen(agente, { esPequenoContribuyente: true })).toEqual({
      esPequenoContribuyente: true,
      regimenIsr: null,
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: false,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: true,
    });
  });

  it('quien deja de ser pequeño contribuyente vuelve a «sobre las utilidades»', () => {
    const pequeno = conCambioDeRegimen(fiscalesDeProveedorPorOmision(), { esPequenoContribuyente: true });
    expect(conCambioDeRegimen(pequeno, { esPequenoContribuyente: false })).toEqual(fiscalesDeProveedorPorOmision());
  });

  it('cambiar el régimen de ISR vuelve a proponer la retención del ISR', () => {
    const simplificado = conCambioDeRegimen(fiscalesDeProveedorPorOmision(), { regimenIsr: 'opcional_simplificado' });
    expect(simplificado.seLeRetieneIsr).toBe(true);
    expect(conCambioDeRegimen(simplificado, { regimenIsr: 'no_domiciliado' }).seLeRetieneIsr).toBe(false);
  });

  it('marcar agente de retención propone no retenerle el IVA', () => {
    expect(conCambioDeRegimen(fiscalesDeProveedorPorOmision(), { esAgenteDeRetencionIva: true }).seLeRetieneIva).toBe(
      false,
    );
  });

  it('detecta las retenciones que el usuario ajustó a mano', () => {
    const porOmision = fiscalesDeProveedorPorOmision();
    expect(retencionesSonLasPropuestas(porOmision)).toBe(true);
    expect(retencionesSonLasPropuestas({ ...porOmision, seLeRetieneIva: false })).toBe(false);
  });

  it('al pasar del servidor al formulario deja fuera el id y la marca de guardado', () => {
    const dto: DatosFiscalesDeProveedor = { proveedorId: 'p1', guardado: true, ...fiscalesDeProveedorPorOmision() };
    expect(fiscalesDeProveedorDesde(dto)).toEqual(fiscalesDeProveedorPorOmision());
  });

  it('la ficha de un pequeño contribuyente solo muestra su retención', () => {
    const pequeno = conCambioDeRegimen(fiscalesDeProveedorPorOmision(), { esPequenoContribuyente: true });
    const etiquetas = detallesDeProveedor(pequeno).map((d) => d.etiqueta);
    expect(etiquetas).toContain('Se le retiene el IVA de pequeño contribuyente');
    expect(etiquetas).not.toContain('Se le retiene el ISR');
    expect(detallesDeProveedor(pequeno).find((d) => d.etiqueta === 'Régimen de ISR')?.valor).toContain('No aplica');
  });
});
