import { describe, expect, it } from 'vitest';
import { documentoSembrado } from '../pruebas/dobles-de-aplicaciones.js';
import {
  avisoDelPosfechado,
  avisoDeRetencionNoDescontada,
  avisosDeLaLinea,
  type LineaParaAvisar,
} from './avisos-de-pagos.js';

const linea = (cambios: Partial<LineaParaAvisar> = {}): LineaParaAvisar => ({
  documento: documentoSembrado({ serie: 'A', numero: '15', origen: 'libro_de_compras' }),
  fechaDelPago: '2026-11-10',
  retencionDescontadaCentavos: 0,
  retenciones: [],
  fechaDeRecepcion: '2026-11-01',
  contrasena: { numero: '3', fecha: '2026-11-02' },
  ...cambios,
});

describe('los avisos de una línea del pago', () => {
  it('sin nada especial no avisa', () => {
    expect(avisosDeLaLinea(linea())).toEqual([]);
  });

  it('avisa la constancia sin emitir y el mes de entero solo si este pago descuenta la retención', () => {
    const retenciones = [{ impuesto: 'iva' as const, montoCentavos: 100, fecha: '2026-10-15', constanciaNumero: null }];

    expect(avisosDeLaLinea(linea({ retenciones }))).toEqual([]);
    const avisos = avisosDeLaLinea(linea({ retenciones, retencionDescontadaCentavos: 100 }));
    expect(avisos[0]).toContain('retención de IVA de la factura A-15 no tiene constancia');
    expect(avisos[1]).toContain('es de 10/2026');
  });

  it('avisa las retenciones por practicar de un saldo inicial', () => {
    const inicial = documentoSembrado({
      origen: 'saldo_inicial',
      serie: 'S',
      numero: '9',
      retencionesPorPracticarCentavos: 5000,
    });

    const avisos = avisosDeLaLinea(linea({ documento: inicial, fechaDeRecepcion: null }));

    expect(avisos[0]).toContain('Q50.00 de retenciones por practicar');
  });

  it('avisa si la fecha es anterior a la recepción o a la contraseña, sin bloquear', () => {
    const avisos = avisosDeLaLinea(linea({ fechaDelPago: '2026-10-30' }));

    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toContain('anterior a la recepción de la factura A-15 (01/11/2026)');
    expect(avisos[1]).toContain('anterior a la fecha de la contraseña 3');
  });

  it('el cheque posfechado se paga a la vista y compromete el documento', () => {
    expect(avisoDelPosfechado('cheque', '2026-12-01')).toContain('a la vista');
    expect(avisoDelPosfechado('nota_de_debito', '2026-12-01')).not.toContain('a la vista');
    expect(avisoDelPosfechado('cheque_de_apertura', '2026-12-01')).toContain('El cheque lleva fecha');
  });

  it('al ligar una nota avisa que el banco debitó sin descontar la retención y cuánto le queda a la nota', () => {
    const aviso = avisoDeRetencionNoDescontada(linea().documento, {
      retencionCentavos: 12_000,
      restanteDeLaNotaCentavos: 46_000,
    });

    expect(aviso).toContain('debitó la nota sin descontar la retención de Q120.00 de la factura A-15');
    expect(aviso).toContain('quedan Q460.00 de la nota por aplicar');
  });
});
