import { describe, expect, it } from 'vitest';
import {
  conCambioFiscal,
  detallesDeCliente,
  explicacionDeLoQueRetiene,
  fiscalesDeClienteDesde,
  fiscalesDeClientePorOmision,
  opcionesDeAgente,
  opcionesQueAplican,
} from './datos-fiscales-de-cliente';

describe('datos fiscales de un cliente', () => {
  it('sin datos guardados no retiene nada', () => {
    expect(fiscalesDeClientePorOmision()).toEqual({
      agenteDeRetencionIva: 'ninguno',
      exportaProductosAgropecuarios: false,
      retieneIsr: false,
      retieneIvaAPequenoContribuyente: false,
    });
    expect(explicacionDeLoQueRetiene(fiscalesDeClientePorOmision())).toEqual([]);
  });

  it('lo guardado pasa al formulario sin el id ni el indicador de guardado', () => {
    const datos = { clienteId: 'c1', guardado: true, ...fiscalesDeClientePorOmision(), retieneIsr: true };

    expect(fiscalesDeClienteDesde(datos)).toEqual({ ...fiscalesDeClientePorOmision(), retieneIsr: true });
  });

  it('quien deja de ser agente deja de retener el IVA de pequeño contribuyente y de exportar', () => {
    const exportador = conCambioFiscal(fiscalesDeClientePorOmision(), {
      agenteDeRetencionIva: 'exportador',
      exportaProductosAgropecuarios: true,
      retieneIvaAPequenoContribuyente: true,
    });
    expect(exportador.exportaProductosAgropecuarios).toBe(true);

    const especial = conCambioFiscal(exportador, { agenteDeRetencionIva: 'contribuyente_especial' });
    expect(especial.exportaProductosAgropecuarios).toBe(false);
    expect(especial.retieneIvaAPequenoContribuyente).toBe(true);

    const ninguno = conCambioFiscal(especial, { agenteDeRetencionIva: 'ninguno' });
    expect(ninguno.retieneIvaAPequenoContribuyente).toBe(false);
  });

  it('dice qué opciones caben con el agente escogido', () => {
    const base = fiscalesDeClientePorOmision();
    expect(opcionesQueAplican(base)).toEqual({
      exportaProductosAgropecuarios: false,
      retieneIvaAPequenoContribuyente: false,
    });
    expect(opcionesQueAplican({ ...base, agenteDeRetencionIva: 'exportador' })).toEqual({
      exportaProductosAgropecuarios: true,
      retieneIvaAPequenoContribuyente: true,
    });
  });

  it('el selector pone primero «No es agente» y luego los demás por nombre', () => {
    const textos = opcionesDeAgente().map(({ texto }) => texto);

    expect(textos[0]).toBe('No es agente de retención');
    expect(textos.slice(1)).toEqual([...textos.slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('explica cada retención que se propondrá', () => {
    const fiscales = conCambioFiscal(fiscalesDeClientePorOmision(), {
      agenteDeRetencionIva: 'exportador',
      exportaProductosAgropecuarios: true,
      retieneIsr: true,
    });

    expect(explicacionDeLoQueRetiene(fiscales)).toHaveLength(3);
  });

  it('la ficha muestra los cuatro datos', () => {
    expect(detallesDeCliente(fiscalesDeClientePorOmision()).map((detalle) => detalle.etiqueta)).toEqual([
      'Agente de retención del IVA',
      'Exporta productos agropecuarios',
      'Retiene ISR',
      'Retiene el IVA de pequeño contribuyente',
    ]);
  });
});
