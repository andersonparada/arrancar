import { describe, expect, it } from 'vitest';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { edicionDe } from './edicion-de-concepto-de-gasto';
import { ajustarTipoSegunActivoFijo, datosParaCambiarEstado, tipoBloqueado } from './reglas-de-concepto-de-gasto';

const concepto: ConceptoDeGasto = {
  id: 'c-1',
  nombre: 'Alimento para ganado',
  tipoPorOmision: 'servicio',
  esProductoAgropecuario: true,
  esActivoFijo: false,
  activo: true,
};

describe('activo fijo y tipo por omisión', () => {
  it('sin la marca el tipo se puede elegir', () => {
    expect(tipoBloqueado(edicionDe(concepto))).toBe(false);
  });

  it('al marcar activo fijo el tipo queda en Bien y no se puede cambiar', () => {
    const edicion = edicionDe(concepto);
    edicion.esActivoFijo = true;
    ajustarTipoSegunActivoFijo(edicion);
    expect(edicion.tipoPorOmision).toBe('bien');
    expect(tipoBloqueado(edicion)).toBe(true);
  });

  it('al desmarcar no se cambia el tipo que había', () => {
    const edicion = edicionDe(concepto);
    ajustarTipoSegunActivoFijo(edicion);
    expect(edicion.tipoPorOmision).toBe('servicio');
  });
});

describe('inactivar y reactivar', () => {
  it('manda los mismos datos con activo invertido y sin id', () => {
    const { id: _id, ...datos } = concepto;
    expect(datosParaCambiarEstado(concepto)).toEqual({ ...datos, activo: false });
    expect(datosParaCambiarEstado({ ...concepto, activo: false }).activo).toBe(true);
  });
});
