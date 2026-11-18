import { describe, expect, it } from 'vitest';
import {
  esReciboDeEfectivo,
  leyendasDelComprobante,
  rotulosDeFirmas,
  tituloDelComprobante,
} from './comprobante-de-pago.js';
import type { FormaDePago } from './pagos.js';

const FORMAS: FormaDePago[] = ['cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo'];

describe('comprobante de pago', () => {
  it('el pago en efectivo es un «Recibo de pago en efectivo» y las demás formas, un comprobante', () => {
    expect(tituloDelComprobante('efectivo')).toBe('Recibo de pago en efectivo');
    expect(FORMAS.filter(esReciboDeEfectivo)).toEqual(['efectivo']);
    for (const forma of FORMAS.filter((f) => f !== 'efectivo')) {
      expect(tituloDelComprobante(forma)).not.toMatch(/Recibo/);
    }
  });

  it('toda forma lleva la leyenda de las constancias y la de que no es documento tributario', () => {
    for (const forma of FORMAS) {
      const leyendas = leyendasDelComprobante(forma);
      expect(leyendas[0]).toBe('Las retenciones se documentan con su constancia.');
      expect(leyendas[1]).toMatch(/no es un documento tributario\.$/);
    }
    expect(leyendasDelComprobante('efectivo')[1]).toBe('Este recibo no es un documento tributario.');
    expect(leyendasDelComprobante('cheque')[1]).toBe('Este comprobante no es un documento tributario.');
  });

  it('las firmas son «Entregado por» y «Recibí conforme»', () => {
    expect(rotulosDeFirmas('efectivo').entrega).toBe('Entregado por (custodio)');
    expect(rotulosDeFirmas('cheque').entrega).toBe('Entregado por (empresa)');
    expect(rotulosDeFirmas('cheque').recibe).toMatch(/^Recibí conforme/);
  });
});
