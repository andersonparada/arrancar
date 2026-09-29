import { describe, expect, it } from 'vitest';
import type { DatosFiscalesDeEmpresa, DatosFiscalesDeProveedor } from '../servicios/libro-de-compras.api';
import {
  conRegimenDeIva,
  detallesDeEmpresa,
  fiscalesDeEmpresaDesde,
  fiscalesDeEmpresaPorOmision,
} from './datos-fiscales-de-empresa';
import {
  conCambioDeRegimen,
  detallesDeProveedor,
  fiscalesDeProveedorDesde,
  fiscalesDeProveedorPorOmision,
  retencionesPropuestas,
  retencionesSonLasPropuestas,
} from './datos-fiscales-de-proveedor';

describe('datos fiscales de la empresa', () => {
  it('sin datos guardados es régimen general, sobre utilidades y sin agente', () => {
    expect(fiscalesDeEmpresaPorOmision()).toEqual({
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: false,
    });
  });

  it('al pasar del servidor al formulario deja fuera el id y la marca de guardado', () => {
    const dto: DatosFiscalesDeEmpresa = { empresaId: 'e1', guardado: true, ...fiscalesDeEmpresaPorOmision() };
    expect(fiscalesDeEmpresaDesde(dto)).toEqual(fiscalesDeEmpresaPorOmision());
  });

  it('un pequeño contribuyente deja de ser agente de retención del IVA', () => {
    const agente = { ...fiscalesDeEmpresaPorOmision(), agenteDeRetencionIva: 'exportador' as const };
    expect(conRegimenDeIva(agente, 'pequeno_contribuyente').agenteDeRetencionIva).toBe('ninguno');
    expect(conRegimenDeIva(agente, 'general').agenteDeRetencionIva).toBe('exportador');
  });

  it('la ficha usa nombres legibles', () => {
    const detalles = detallesDeEmpresa({ ...fiscalesDeEmpresaPorOmision(), esAgenteDeRetencionIsr: true });
    expect(detalles.map((d) => d.valor)).toEqual(['General', 'Sobre las utilidades', 'Ninguno', 'Sí']);
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
