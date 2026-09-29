import { numeroONulo, textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosLocalidad, Localidad } from '../../servicios/localidades.api';

/** Lo que muestra cada campo de la ventana mientras se edita una localidad. */
export interface EdicionDeLocalidad {
  abierta: boolean;
  id: string | null;
  codigo: string;
  nombre: string;
  tipoId: string | null;
  codigoEstablecimientoSat: string | number;
  nombreComercialSat: string;
  departamentoCodigo: string;
  municipioCodigo: string;
  direccion: string;
  activo: boolean;
}

const LOCALIDAD_NUEVO: Omit<EdicionDeLocalidad, 'abierta' | 'id'> = {
  codigo: '',
  nombre: '',
  tipoId: null,
  codigoEstablecimientoSat: '',
  nombreComercialSat: '',
  departamentoCodigo: '',
  municipioCodigo: '',
  direccion: '',
  activo: true,
};

/** La ventana abierta con los datos de la localidad, o vacía si es nuevo. */
export function edicionDe(localidad?: Localidad): EdicionDeLocalidad {
  if (!localidad) return { abierta: true, id: null, ...LOCALIDAD_NUEVO };
  return {
    abierta: true,
    id: localidad.id,
    codigo: textoDeEdicion(localidad.codigo),
    nombre: textoDeEdicion(localidad.nombre),
    tipoId: localidad.tipoId,
    codigoEstablecimientoSat: textoDeEdicion(localidad.codigoEstablecimientoSat),
    nombreComercialSat: textoDeEdicion(localidad.nombreComercialSat),
    departamentoCodigo: textoDeEdicion(localidad.departamentoCodigo),
    municipioCodigo: textoDeEdicion(localidad.municipioCodigo),
    direccion: textoDeEdicion(localidad.direccion),
    activo: localidad.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeLocalidad = (edicion: EdicionDeLocalidad): DatosLocalidad => ({
  codigo: edicion.codigo,
  nombre: edicion.nombre,
  tipoId: edicion.tipoId ?? '',
  codigoEstablecimientoSat: numeroONulo(edicion.codigoEstablecimientoSat),
  nombreComercialSat: textoONulo(edicion.nombreComercialSat),
  departamentoCodigo: textoONulo(edicion.departamentoCodigo),
  municipioCodigo: textoONulo(edicion.municipioCodigo),
  direccion: textoONulo(edicion.direccion),
  activo: edicion.activo,
});
