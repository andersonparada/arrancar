import type {
  ClaveDePlantilla,
  DatosDeFormatoDeCheque,
  FormatoDeChequeDetalle,
  FormatoDeChequeGuardado,
  FormatoDeCheque,
  PlantillaDeCheque,
} from '../../servicios/tipos-de-formatos-de-cheque';
import { ajustesDeFormato, copiaDelFormato } from './ajustes-de-formato';

/** Lo que muestra la ventana mientras se arma un formato: su nombre, su plantilla de fábrica y sus medidas ya resueltas. */
export interface EdicionDeFormatoDeCheque {
  abierta: boolean;
  id: string | null;
  nombre: string;
  base: ClaveDePlantilla;
  /** Las medidas completas (plantilla más ajustes); al guardar solo viaja lo que difiere de la plantilla. */
  formato: FormatoDeCheque | null;
  /** El formato guardado ya no cumple las reglas: se muestra con la plantilla para corregirlo. */
  danado: boolean;
}

export const PLANTILLA_POR_OMISION: ClaveDePlantilla = 'cheque_suelto';

const plantillaDe = (plantillas: PlantillaDeCheque[], clave: ClaveDePlantilla): PlantillaDeCheque | undefined =>
  plantillas.find((plantilla) => plantilla.clave === clave);

/** La ventana cerrada. */
export const edicionCerrada = (): EdicionDeFormatoDeCheque => ({
  abierta: false,
  id: null,
  nombre: '',
  base: PLANTILLA_POR_OMISION,
  formato: null,
  danado: false,
});

/** Un formato nuevo, que parte de una plantilla de fábrica (la que se elija o el cheque suelto). */
export function edicionNueva(plantillas: PlantillaDeCheque[], clave?: ClaveDePlantilla): EdicionDeFormatoDeCheque {
  const base = clave ?? PLANTILLA_POR_OMISION;
  const plantilla = plantillaDe(plantillas, base);
  return {
    abierta: true,
    id: null,
    nombre: '',
    base,
    formato: plantilla ? copiaDelFormato(plantilla.formato) : null,
    danado: false,
  };
}

/** Un formato guardado: con sus medidas resueltas; si está dañado, vuelve a la plantilla para corregirlo. */
export function edicionDeFormato(
  detalle: FormatoDeChequeDetalle,
  plantillas: PlantillaDeCheque[],
): EdicionDeFormatoDeCheque {
  const origen = detalle.resuelto ?? plantillaDe(plantillas, detalle.base)?.formato ?? null;
  return {
    abierta: true,
    id: detalle.id,
    nombre: detalle.nombre,
    base: detalle.base,
    formato: origen ? copiaDelFormato(origen) : null,
    danado: detalle.danado,
  };
}

/** Cambiar la plantilla de fábrica reemplaza todas las medidas por las de la nueva (el nombre se conserva). */
export function conOtraBase(
  edicion: EdicionDeFormatoDeCheque,
  plantillas: PlantillaDeCheque[],
  base: ClaveDePlantilla,
): EdicionDeFormatoDeCheque {
  const plantilla = plantillaDe(plantillas, base);
  return { ...edicion, base, formato: plantilla ? copiaDelFormato(plantilla.formato) : edicion.formato };
}

/** Lo que se manda al servidor: el nombre, la plantilla y solo lo que difiere de ella. */
export function datosDeFormato(
  edicion: EdicionDeFormatoDeCheque,
  plantillas: PlantillaDeCheque[],
): DatosDeFormatoDeCheque {
  const plantilla = plantillaDe(plantillas, edicion.base);
  const ajustes = plantilla && edicion.formato ? ajustesDeFormato(plantilla.formato, edicion.formato) : {};
  return { nombre: edicion.nombre.trim(), base: edicion.base, ajustes };
}

/** Qué se ve en la tarjeta del formato junto a su nombre: sin probar o probado. */
export const textoDeLaPrueba = (formato: Pick<FormatoDeChequeGuardado, 'probadoEn'>): string =>
  formato.probadoEn ? 'Prueba de alineación hecha' : 'Sin probar la alineación';

/** Los problemas por campo que manda el servidor cuando el formato no cumple las reglas (`detalles.campos`). */
export function problemasDeFormato(detalles: unknown): string[] {
  const campos = (detalles as { campos?: unknown } | null | undefined)?.campos;
  return Array.isArray(campos) ? campos.filter((campo): campo is string => typeof campo === 'string') : [];
}

/** Los formatos por nombre (sin distinguir mayúsculas ni tildes), para la lista y los selectores. */
export function ordenarFormatos<T extends { nombre: string }>(formatos: readonly T[]): T[] {
  return [...formatos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}
