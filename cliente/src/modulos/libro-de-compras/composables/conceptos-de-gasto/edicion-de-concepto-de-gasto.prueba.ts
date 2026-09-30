import { describe, expect, it } from 'vitest';
import type { DatosConceptoDeGasto, ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { datosDeConceptoDeGasto, edicionDe } from './edicion-de-concepto-de-gasto';

const datos: DatosConceptoDeGasto = {
  nombre: 'Registro de prueba',
  tipoPorOmision: 'bien',
  esProductoAgropecuario: false,
  esActivoFijo: false,
  activo: true,
};
const conceptoDeGasto: ConceptoDeGasto = { id: 'registro-1', ...datos };

describe('ventana de conceptos de gasto', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeConceptoDeGasto(edicionDe(conceptoDeGasto))).toEqual(datos);
    expect(edicionDe(conceptoDeGasto).id).toBe(conceptoDeGasto.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
