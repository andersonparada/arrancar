import type { Concepto, DatosConcepto } from '../../servicios/conceptos.api';
import type { EdicionDeConcepto } from './edicion-de-concepto';

/** Los conceptos con clave de sistema los usa Arrancar por dentro: no se tocan. */
export const esDeSistema = (concepto: Concepto): boolean => concepto.claveDeSistema !== null;

/** Qué botones muestra la tarjeta; el servidor igual lo valida (422). */
export const accionesDeConcepto = (concepto: Concepto) => {
  const delUsuario = !esDeSistema(concepto);
  return { editar: delUsuario, cambiarEstado: delUsuario, eliminar: delUsuario };
};

/** Los datos de intereses se acreditan, así que solo aplican a créditos o a ambos. */
export const admiteDatosDeIntereses = (aplicaA: Concepto['aplicaA']): boolean => aplicaA !== 'debito';

/** Si el concepto pasa a ser solo de débitos, apaga la bandera de intereses. */
export function sinInteresesSiEsDebito(edicion: EdicionDeConcepto): void {
  if (!admiteDatosDeIntereses(edicion.aplicaA)) edicion.pideDatosDeIntereses = false;
}

/** Lo que se manda al servidor para inactivar o reactivar: el mismo concepto con `activo` invertido. */
export const datosParaCambiarEstado = (concepto: Concepto): DatosConcepto => ({
  nombre: concepto.nombre,
  aplicaA: concepto.aplicaA,
  actividadDeFlujo: concepto.actividadDeFlujo,
  grupoDeFlujo: concepto.grupoDeFlujo,
  esCargoBancario: concepto.esCargoBancario,
  pideDatosDeIntereses: concepto.pideDatosDeIntereses,
  admiteFactura: concepto.admiteFactura,
  activo: !concepto.activo,
});

/** La pregunta antes de inactivar o reactivar. */
export const mensajeDeCambioDeEstado = (concepto: Concepto): string =>
  concepto.activo
    ? `¿Inactivar el concepto «${concepto.nombre}»? Dejará de ofrecerse, pero lo ya registrado se conserva.`
    : `¿Reactivar el concepto «${concepto.nombre}»?`;

/** Orden alfabético por nombre, como lo espera quien busca en la lista. */
export const ordenarPorNombre = (conceptos: Concepto[]): Concepto[] =>
  [...conceptos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
