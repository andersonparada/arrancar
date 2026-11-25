import { describe, expect, it } from 'vitest';
import {
  DatosFiscalesDeCliente,
  DatosFiscalesDeClienteInvalidos,
  type PropiedadesFiscalesDeCliente,
} from './datos-fiscales-de-cliente.js';

const propiedades = (cambios: Partial<PropiedadesFiscalesDeCliente> = {}): PropiedadesFiscalesDeCliente => ({
  agenteDeRetencionIva: 'ninguno',
  exportaProductosAgropecuarios: false,
  retieneIsr: false,
  retieneIvaAPequenoContribuyente: false,
  ...cambios,
});

describe('DatosFiscalesDeCliente', () => {
  it('sin datos guardados el cliente no retiene nada (no se supone)', () => {
    expect(DatosFiscalesDeCliente.porOmision().instantanea()).toEqual(propiedades());
  });

  it('un agente de retención puede retener el IVA a pequeños contribuyentes y el ISR al opcional simplificado', () => {
    const datos = DatosFiscalesDeCliente.crear(
      propiedades({
        agenteDeRetencionIva: 'contribuyente_especial',
        retieneIvaAPequenoContribuyente: true,
        retieneIsr: true,
      }),
    );

    expect(datos.instantanea()).toMatchObject({ retieneIvaAPequenoContribuyente: true, retieneIsr: true });
  });

  it('solo un exportador compra productos agropecuarios para exportarlos', () => {
    expect(() => DatosFiscalesDeCliente.crear(propiedades({ exportaProductosAgropecuarios: true }))).toThrow(
      DatosFiscalesDeClienteInvalidos,
    );
    expect(
      DatosFiscalesDeCliente.crear(
        propiedades({ agenteDeRetencionIva: 'exportador', exportaProductosAgropecuarios: true }),
      ),
    ).toBeTruthy();
  });

  it('retener el IVA de pequeño contribuyente exige ser agente de retención, y el error dice el campo', () => {
    const intento = () => DatosFiscalesDeCliente.crear(propiedades({ retieneIvaAPequenoContribuyente: true }));

    expect(intento).toThrow(DatosFiscalesDeClienteInvalidos);
    try {
      intento();
    } catch (error) {
      expect((error as DatosFiscalesDeClienteInvalidos).problemas.map((p) => p.campo)).toEqual([
        'retieneIvaAPequenoContribuyente',
      ]);
    }
  });

  it('compara dos datos por sus valores y entrega copias', () => {
    const uno = DatosFiscalesDeCliente.crear(propiedades({ retieneIsr: true }));

    expect(uno.esIgualA(DatosFiscalesDeCliente.crear(propiedades({ retieneIsr: true })))).toBe(true);
    expect(uno.esIgualA(DatosFiscalesDeCliente.porOmision())).toBe(false);
    expect(uno.instantanea()).not.toBe(uno.instantanea());
  });
});
