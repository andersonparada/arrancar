import { describe, expect, it } from 'vitest';
import { NotaDeDebitoSostieneNotasDeCredito } from './errores-de-baja.js';
import { FacturaNoSirveParaLaNota, NotaSuperaLaFactura } from './errores-de-documento.js';
import { exigirFacturaQueAdmiteLaNota, type FacturaDeLaNota, type NotaPorRegistrar } from './factura-de-la-nota.js';
import {
  exigirQueLaNotaNoSupereLaFactura,
  exigirQueLasNotasDeCreditoSigaCabiendo,
  type FacturaConNotas,
} from './tope-de-notas.js';

const factura = (cambios: Partial<FacturaDeLaNota> = {}): FacturaDeLaNota => ({
  tipo: 'factura',
  estado: 'vigente',
  proveedorId: 'p1',
  destino: 'cuentas-por-pagar',
  muestraEnReportesSat: true,
  ...cambios,
});
const nota = (cambios: Partial<NotaPorRegistrar> = {}): NotaPorRegistrar => ({
  tipo: 'nota_de_debito',
  proveedorId: 'p1',
  destino: 'cuentas-por-pagar',
  muestraEnReportesSat: true,
  ...cambios,
});

describe('exigirFacturaQueAdmiteLaNota', () => {
  it('acepta cada familia de factura vigente del mismo proveedor y destino, para las dos notas', () => {
    const familias = [
      'factura',
      'factura_pequeno_contribuyente',
      'factura_pequeno_contribuyente_electronico',
      'factura_contribuyente_agropecuario',
      'factura_primario_pecuario',
    ] as const;
    for (const tipo of familias) {
      expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo }), nota())).not.toThrow();
      expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo }), nota({ tipo: 'nota_de_credito' }))).not.toThrow();
    }
  });

  it('rechaza la factura especial, el recibo, otra nota y la factura anulada', () => {
    for (const tipo of ['factura_especial', 'recibo', 'nota_de_credito', 'nota_de_debito'] as const) {
      expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo }), nota())).toThrow(FacturaNoSirveParaLaNota);
    }
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ estado: 'anulado' }), nota())).toThrow(
      /nota de débito debe corregir una factura vigente/,
    );
  });

  it('rechaza otro proveedor u otro destino', () => {
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ proveedorId: 'p2' }), nota())).toThrow(
      FacturaNoSirveParaLaNota,
    );
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ destino: 'caja-chica' }), nota())).toThrow(
      FacturaNoSirveParaLaNota,
    );
  });

  it('la casilla SAT de la nota va atada a la de su factura, en las dos notas y en los dos sentidos', () => {
    const fuera = { muestraEnReportesSat: false };

    expect(() => exigirFacturaQueAdmiteLaNota(factura(fuera), nota())).toThrow(FacturaNoSirveParaLaNota);
    expect(() => exigirFacturaQueAdmiteLaNota(factura(), nota({ tipo: 'nota_de_credito', ...fuera }))).toThrow(
      FacturaNoSirveParaLaNota,
    );
    expect(() =>
      exigirFacturaQueAdmiteLaNota(factura(fuera), nota({ tipo: 'nota_de_credito', ...fuera })),
    ).not.toThrow();
  });
});

const conNotas = (cambios: Partial<FacturaConNotas> = {}): FacturaConNotas => ({
  total: 112000,
  iva: 12000,
  totalDeNotasDeCredito: 0,
  ivaDeNotasDeCredito: 0,
  totalDeNotasDeDebito: 0,
  ivaDeNotasDeDebito: 0,
  ...cambios,
});

describe('exigirQueLaNotaNoSupereLaFactura', () => {
  const credito = (total: number) => ({ tipo: 'nota_de_credito', total }) as const;

  it('las notas de crédito pueden sumar hasta el total de la factura, no más', () => {
    expect(() =>
      exigirQueLaNotaNoSupereLaFactura(conNotas({ totalDeNotasDeCredito: 100000 }), credito(12000)),
    ).not.toThrow();
    expect(() => exigirQueLaNotaNoSupereLaFactura(conNotas({ totalDeNotasDeCredito: 100000 }), credito(12001))).toThrow(
      NotaSuperaLaFactura,
    );
  });

  it('las notas de débito vigentes agrandan el tope', () => {
    const factura = conNotas({ totalDeNotasDeCredito: 112000, totalDeNotasDeDebito: 30000 });

    expect(() => exigirQueLaNotaNoSupereLaFactura(factura, credito(30000))).not.toThrow();
    expect(() => exigirQueLaNotaNoSupereLaFactura(factura, credito(30001))).toThrow(NotaSuperaLaFactura);
  });

  it('la nota de débito no tiene tope', () => {
    const lleno = conNotas({ totalDeNotasDeCredito: 112000 });

    expect(() => exigirQueLaNotaNoSupereLaFactura(lleno, { tipo: 'nota_de_debito', total: 999999 })).not.toThrow();
  });
});

describe('exigirQueLasNotasDeCreditoSigaCabiendo (anular o eliminar una nota de débito)', () => {
  const quitada = { total: 30000, iva: 3000 };

  it('se puede quitar si las notas de crédito siguen cabiendo sin ella', () => {
    const factura = conNotas({ totalDeNotasDeDebito: 30000, ivaDeNotasDeDebito: 3000, totalDeNotasDeCredito: 112000 });

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(factura, quitada)).not.toThrow();
  });

  it('no se puede si el total de las notas de crédito pasaría de la factura', () => {
    const factura = conNotas({ totalDeNotasDeDebito: 30000, ivaDeNotasDeDebito: 3000, totalDeNotasDeCredito: 112001 });

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(factura, quitada)).toThrow(NotaDeDebitoSostieneNotasDeCredito);
  });

  it('no se puede si el IVA de las notas de crédito pasaría del de la factura', () => {
    const factura = conNotas({ totalDeNotasDeDebito: 30000, ivaDeNotasDeDebito: 3000, ivaDeNotasDeCredito: 12001 });

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(factura, quitada)).toThrow(NotaDeDebitoSostieneNotasDeCredito);
  });

  it('las otras notas de débito siguen sosteniendo: solo se descuenta la que se quita', () => {
    const factura = conNotas({
      totalDeNotasDeDebito: 50000,
      ivaDeNotasDeDebito: 5000,
      totalDeNotasDeCredito: 132000,
      ivaDeNotasDeCredito: 14000,
    });

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(factura, quitada)).not.toThrow();
  });
});
