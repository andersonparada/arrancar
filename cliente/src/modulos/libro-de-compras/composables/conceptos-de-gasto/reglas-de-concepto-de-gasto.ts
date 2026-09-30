import type { ConceptoDeGasto, DatosConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { datosDeConceptoDeGasto, edicionDe, type EdicionDeConceptoDeGasto } from './edicion-de-concepto-de-gasto';

export const NOMBRE_DE_CONCEPTO_DE_GASTO = { conArticulo: 'el concepto de gasto', capitalizado: 'Concepto de gasto' };

/** Un activo fijo siempre es un bien: con la marca puesta, el tipo no se puede cambiar. */
export const tipoBloqueado = (edicion: Pick<EdicionDeConceptoDeGasto, 'esActivoFijo'>): boolean => edicion.esActivoFijo;

/** Al marcar «Activo fijo» el tipo pasa a Bien. */
export function ajustarTipoSegunActivoFijo(edicion: EdicionDeConceptoDeGasto): void {
  if (tipoBloqueado(edicion)) edicion.tipoPorOmision = 'bien';
}

/** Lo que se manda para inactivar o reactivar: el mismo concepto con `activo` invertido. */
export const datosParaCambiarEstado = (concepto: ConceptoDeGasto): DatosConceptoDeGasto => ({
  ...datosDeConceptoDeGasto(edicionDe(concepto)),
  activo: !concepto.activo,
});
