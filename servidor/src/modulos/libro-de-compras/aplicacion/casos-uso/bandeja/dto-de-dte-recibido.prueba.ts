import { describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DteRecibido, type DatosDelDte } from '../../../dominio/dte-recibido.js';
import { dtoDeDteRecibido } from './dto-de-dte-recibido.js';

function filaDe(cambios: Partial<DatosDelDte>): DteRecibido {
  const datos = {
    autorizacionFel: crypto.randomUUID(),
    tipoDte: 'FESP',
    serie: 'A',
    numero: '1',
    fechaEmision: '2026-03-10',
    nitEmisor: '576937K',
    nombreEmisor: 'Proveedor',
    nitReceptor: '1234567',
    total: '1120.00',
    iva: '120.00',
    idp: '0.00',
    otrosImpuestos: '0.00',
    otrosImpuestosDetalle: [],
    filaOriginal: {},
    estadoSat: 'vigente',
    anuladoEnLaSatEl: null,
    ...cambios,
  } as DatosDelDte;
  return DteRecibido.crear({ empresaId: Identificador.nuevo<'Empresa'>(), loteId: crypto.randomUUID(), datos });
}

describe('marcas de anterioridad en la bandeja', () => {
  it('una compra anterior al inicio y en plazo se marca', () => {
    const dto = dtoDeDteRecibido(filaDe({ tipoDte: 'FACT' }), null, '2026-04-01');

    expect(dto.enPlazoDeCredito).toBe(true);
  });

  it('una factura especial bloqueada como venta no se marca como compra con crédito', () => {
    const fila = filaDe({});
    fila.bloquear('factura_especial_de_venta');
    const dto = dtoDeDteRecibido(fila, null, '2026-04-01');

    expect(dto.enPlazoDeCredito).toBe(false);
    expect(dto.anteriorALaFechaDeInicio).toBe(false);
  });
});
