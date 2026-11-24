import type { ConceptoDeIngreso, DatosConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { datosDeConceptoDeIngreso, edicionDe } from './edicion-de-concepto-de-ingreso';

export const NOMBRE_DE_CONCEPTO_DE_INGRESO = {
  conArticulo: 'el concepto de ingreso',
  capitalizado: 'Concepto de ingreso',
};

/** Lo que se manda para inactivar o reactivar: el mismo concepto con `activo` invertido. */
export const datosParaCambiarEstado = (concepto: ConceptoDeIngreso): DatosConceptoDeIngreso => ({
  ...datosDeConceptoDeIngreso(edicionDe(concepto)),
  activo: !concepto.activo,
});

/** Los conceptos de sistema (venta de un activo fijo) los usa el sistema: no se editan, inactivan ni eliminan. */
export const esDeSistema = (concepto: Pick<ConceptoDeIngreso, 'claveDeSistema'>): boolean =>
  concepto.claveDeSistema !== null;

export const EXPLICACION_DE_SISTEMA =
  'Lo usa el sistema al vender un activo fijo: no se puede cambiar, inactivar ni eliminar.';
