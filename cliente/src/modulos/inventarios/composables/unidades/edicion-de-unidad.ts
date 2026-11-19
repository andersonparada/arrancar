import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import { sinCerosFinales } from '../compartido/cantidades';
import type { DatosUnidad, Magnitud, Unidad } from '../../servicios/unidades.api';

export const OPCIONES_DE_MAGNITUD = {
  cantidad: 'Cantidad',
  masa: 'Masa',
  volumen: 'Volumen',
  longitud: 'Longitud',
  superficie: 'Superficie',
  empaque: 'Empaque',
};

const MAGNITUDES_CON_FACTOR: readonly Magnitud[] = ['masa', 'volumen', 'longitud', 'superficie'];

/** Masa, volumen, longitud y superficie traen su factor a la unidad de referencia; cantidad y empaque no. */
export const llevaFactor = (magnitud: Magnitud): boolean => MAGNITUDES_CON_FACTOR.includes(magnitud);

/** Lo que muestra cada campo de la ventana mientras se edita una unidad de medida. */
export interface EdicionDeUnidad {
  abierta: boolean;
  id: string | null;
  nombre: string;
  simbolo: string;
  magnitud: Magnitud;
  factorALaReferencia: string | number;
  activo: boolean;
}

const UNIDAD_NUEVO: Omit<EdicionDeUnidad, 'abierta' | 'id'> = {
  nombre: '',
  simbolo: '',
  magnitud: 'cantidad',
  factorALaReferencia: '',
  activo: true,
};

/** La ventana abierta con los datos de la unidad de medida, o vacía si es nuevo. */
export function edicionDe(unidad?: Unidad): EdicionDeUnidad {
  if (!unidad) return { abierta: true, id: null, ...UNIDAD_NUEVO };
  return {
    abierta: true,
    id: unidad.id,
    nombre: textoDeEdicion(unidad.nombre),
    simbolo: textoDeEdicion(unidad.simbolo),
    magnitud: unidad.magnitud,
    factorALaReferencia: sinCerosFinales(unidad.factorALaReferencia),
    activo: unidad.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null`; sin factor si la magnitud no lo lleva. */
export const datosDeUnidad = (edicion: EdicionDeUnidad): DatosUnidad => ({
  nombre: edicion.nombre,
  simbolo: edicion.simbolo,
  magnitud: edicion.magnitud,
  factorALaReferencia: llevaFactor(edicion.magnitud) ? textoONulo(edicion.factorALaReferencia) : null,
  activo: edicion.activo,
});
