import type { ConceptoDeGasto, DatosConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { datosDeConceptoDeGasto, edicionDe, type EdicionDeConceptoDeGasto } from './edicion-de-concepto-de-gasto';

export const NOMBRE_DE_CONCEPTO_DE_GASTO = { conArticulo: 'el concepto de gasto', capitalizado: 'Concepto de gasto' };

/** Lo que se manda para inactivar o reactivar: el mismo concepto con `activo` invertido. */
export const datosParaCambiarEstado = (concepto: ConceptoDeGasto): DatosConceptoDeGasto => ({
  ...datosDeConceptoDeGasto(edicionDe(concepto)),
  activo: !concepto.activo,
});

export type DestinoDelCosto = 'activoFijo' | 'inventario';

/**
 * El costo va a un solo destino: marcar activo fijo desmarca inventario y al revés. Un concepto de inventario es
 * siempre un bien.
 */
export function elegirDestinoDelCostoDelConcepto(
  edicion: EdicionDeConceptoDeGasto,
  destino: DestinoDelCosto,
  marcado: boolean,
): void {
  if (destino === 'activoFijo') {
    edicion.esActivoFijo = marcado;
    if (marcado) edicion.esInventario = false;
    return;
  }
  edicion.esInventario = marcado;
  if (marcado) {
    edicion.esActivoFijo = false;
    edicion.tipoPorOmision = 'bien';
  }
}
