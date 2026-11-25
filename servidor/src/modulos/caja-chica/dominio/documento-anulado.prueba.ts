import { describe, expect, it } from 'vitest';
import type { Comprobante } from './comprobantes.js';
import {
  aDisputa,
  aReemplazo,
  aSalida,
  estaPorResolver,
  exigirPendiente,
  fechaLimiteDeLaDisputa,
  SEGUIMIENTO_POR_RESOLVER,
  sinDisputa,
  sinRespaldoFiscal,
  type SeguimientoDelDocumento,
} from './documento-anulado.js';

const comprobante = (seguimiento: SeguimientoDelDocumento | null): Comprobante =>
  ({
    id: 'c1',
    estado: 'vigente',
    fecha: '2026-10-31',
    montoCentavos: 30_000,
    motivoDocumentoAnulado: seguimiento ? 'Anulada por el emisor' : null,
    seguimiento,
    documento: { fechaEmision: '2026-10-31' },
  }) as Comprobante;

const resuelto = (cambios: Partial<SeguimientoDelDocumento>): SeguimientoDelDocumento => ({
  ...SEGUIMIENTO_POR_RESOLVER,
  situacion: 'resuelto',
  ...cambios,
});

describe('fechaLimiteDeLaDisputa', () => {
  it('suma dos meses a la fecha del documento y respeta el fin de mes y el cambio de año', () => {
    expect(fechaLimiteDeLaDisputa('2026-09-15')).toBe('2026-11-15');
    expect(fechaLimiteDeLaDisputa('2026-12-20')).toBe('2027-02-20');
    expect(fechaLimiteDeLaDisputa('2026-12-31')).toBe('2027-02-28');
    expect(fechaLimiteDeLaDisputa('2027-12-31')).toBe('2028-02-29');
  });
});

describe('qué documentos están pendientes y cuáles quedaron sin respaldo', () => {
  it('por resolver y en disputa están pendientes; resuelto, no', () => {
    expect(estaPorResolver(comprobante(null))).toBe(false);
    expect(estaPorResolver(comprobante(SEGUIMIENTO_POR_RESOLVER))).toBe(true);
    expect(estaPorResolver(comprobante({ ...SEGUIMIENTO_POR_RESOLVER, situacion: 'en_disputa' }))).toBe(true);
    expect(estaPorResolver(comprobante(resuelto({ salida: 'cobro' })))).toBe(false);
  });

  it('sin respaldo fiscal es todo documento anulado salvo el reemplazado', () => {
    expect(sinRespaldoFiscal(comprobante(null))).toBe(false);
    expect(sinRespaldoFiscal(comprobante(SEGUIMIENTO_POR_RESOLVER))).toBe(true);
    expect(sinRespaldoFiscal(comprobante(resuelto({ salida: 'sin_recuperacion' })))).toBe(true);
    expect(sinRespaldoFiscal(comprobante(resuelto({ salida: 'reemplazo' })))).toBe(false);
  });
});

describe('las transiciones', () => {
  it('a disputa solo desde por resolver, con la fecha límite del documento; de vuelta, solo desde disputa', () => {
    const enDisputa = aDisputa(comprobante(SEGUIMIENTO_POR_RESOLVER), { motivo: 'Pagamos', prueba: 'Cheque 1' });

    expect(enDisputa).toMatchObject({ situacion: 'en_disputa', disputa: { hasta: '2026-12-31', prueba: 'Cheque 1' } });
    expect(() => aDisputa(comprobante(enDisputa), { motivo: 'x', prueba: 'y' })).toThrow('ya está en disputa');
    expect(sinDisputa(comprobante(enDisputa))).toMatchObject({ situacion: 'por_resolver', disputa: null });
    expect(() => sinDisputa(comprobante(SEGUIMIENTO_POR_RESOLVER))).toThrow('no está en disputa');
  });

  it('lo resuelto no se vuelve a resolver y lo que no tiene documento anulado tampoco', () => {
    expect(() => exigirPendiente(comprobante(resuelto({ salida: 'cobro' })))).toThrow('ya se resolvió');
    expect(() => exigirPendiente(comprobante(null))).toThrow('no tiene un documento anulado');
    expect(() => exigirPendiente({ ...comprobante(SEGUIMIENTO_POR_RESOLVER), estado: 'anulado' })).toThrow();
  });

  it('sin recuperación no lleva monto ni destino; la devolución y el cobro los piden y no pasan de lo gastado', () => {
    const base = comprobante(SEGUIMIENTO_POR_RESOLVER);

    expect(aSalida(base, { salida: 'sin_recuperacion', motivo: 'Se pierde' })).toMatchObject({
      situacion: 'resuelto',
      montoCentavos: null,
      destino: null,
    });
    expect(() => aSalida(base, { salida: 'sin_recuperacion', motivo: 'x', montoCentavos: 100 })).toThrow('no lleva');
    expect(() => aSalida(base, { salida: 'devolucion', motivo: 'x' })).toThrow('piden el monto');
    expect(() => aSalida(base, { salida: 'cobro', motivo: 'x', montoCentavos: 0, destino: 'custodio' })).toThrow();
    expect(() => aSalida(base, { salida: 'cobro', motivo: 'x', montoCentavos: 30_001, destino: 'custodio' })).toThrow(
      'no puede pasar de lo gastado',
    );
    expect(aSalida(base, { salida: 'cobro', motivo: 'x', montoCentavos: 30_000, destino: 'custodio' })).toMatchObject({
      salida: 'cobro',
      montoCentavos: 30_000,
      destino: 'custodio',
    });
  });

  it('el reemplazo guarda la factura anulada y cierra la disputa', () => {
    const enDisputa = aDisputa(comprobante(SEGUIMIENTO_POR_RESOLVER), { motivo: 'Pagamos', prueba: 'Cheque 1' });

    expect(aReemplazo(comprobante(enDisputa), { motivo: 'FEL nueva', documentoAnuladoId: 'doc-1' })).toMatchObject({
      situacion: 'resuelto',
      salida: 'reemplazo',
      documentoAnuladoId: 'doc-1',
      disputa: null,
    });
  });
});
