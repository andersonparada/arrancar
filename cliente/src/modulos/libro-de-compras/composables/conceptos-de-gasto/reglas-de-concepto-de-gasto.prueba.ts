import { describe, expect, it } from 'vitest';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { edicionDe } from './edicion-de-concepto-de-gasto';
import { datosParaCambiarEstado } from './reglas-de-concepto-de-gasto';

const concepto: ConceptoDeGasto = {
  id: 'c-1',
  nombre: 'Combustibles',
  tipoPorOmision: 'servicio',
  esProductoAgropecuario: true,
  esActivoFijo: false,
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
