import { describe, expect, it } from 'vitest';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { edicionDe } from './edicion-de-concepto-de-gasto';
import { datosParaCambiarEstado, elegirDestinoDelCostoDelConcepto } from './reglas-de-concepto-de-gasto';

const concepto: ConceptoDeGasto = {
  id: 'c-1',
  nombre: 'Combustibles',
  tipoPorOmision: 'servicio',
  esProductoAgropecuario: true,
  esActivoFijo: false,
  esInventario: false,
  activo: true,
};

describe('activo fijo y tipo por omisión', () => {
  it('un servicio puede ser activo fijo sin cambiar su tipo', () => {
    const edicion = edicionDe({ ...concepto, esActivoFijo: true });
    expect(edicion.tipoPorOmision).toBe('servicio');
    expect(datosParaCambiarEstado({ ...concepto, esActivoFijo: true })).toMatchObject({
      esActivoFijo: true,
      tipoPorOmision: 'servicio',
    });
  });
});

describe('inactivar y reactivar', () => {
  it('manda los mismos datos con activo invertido y sin id', () => {
    const { id: _id, ...datos } = concepto;
    expect(datosParaCambiarEstado(concepto)).toEqual({ ...datos, activo: false });
    expect(datosParaCambiarEstado({ ...concepto, activo: false }).activo).toBe(true);
  });
});

describe('destino del costo del concepto', () => {
  it('inventario desmarca el activo fijo y fija el tipo en bien', () => {
    const edicion = edicionDe({ ...concepto, esActivoFijo: true });
    elegirDestinoDelCostoDelConcepto(edicion, 'inventario', true);
    expect(edicion).toMatchObject({ esInventario: true, esActivoFijo: false, tipoPorOmision: 'bien' });
  });

  it('activo fijo desmarca el inventario', () => {
    const edicion = edicionDe({ ...concepto, tipoPorOmision: 'bien', esInventario: true });
    elegirDestinoDelCostoDelConcepto(edicion, 'activoFijo', true);
    expect(edicion).toMatchObject({ esInventario: false, esActivoFijo: true });
  });
});
