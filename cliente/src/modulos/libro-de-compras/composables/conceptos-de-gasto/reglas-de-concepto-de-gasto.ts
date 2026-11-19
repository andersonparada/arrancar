import type { ConceptoDeGasto, DatosConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { datosDeConceptoDeGasto, edicionDe } from './edicion-de-concepto-de-gasto';

export const NOMBRE_DE_CONCEPTO_DE_GASTO = { conArticulo: 'el concepto de gasto', capitalizado: 'Concepto de gasto' };

/** Lo que se manda para inactivar o reactivar: el mismo concepto con `activo` invertido. */
export const datosParaCambiarEstado = (concepto: ConceptoDeGasto): DatosConceptoDeGasto => ({
  ...datosDeConceptoDeGasto(edicionDe(concepto)),
  activo: !concepto.activo,
});
