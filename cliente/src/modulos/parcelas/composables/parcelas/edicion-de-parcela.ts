import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { CambioDeParcela, DatosDeParcela, FichaDeParcela, FormaDeTenencia } from '../../servicios/parcelas.api';
import { datosDeMedicion, type EdicionDeMedicion } from '../mediciones/edicion-de-medicion';

export const OPCIONES_DE_TENENCIA: Record<FormaDeTenencia, string> = {
  propia: 'Propia',
  posesion: 'Posesión (propia, sin inscribir)',
  copropiedad: 'Copropiedad',
  arrendada: 'Arrendada',
  usufructo: 'Usufructo',
  comodato: 'Comodato',
  aparceria: 'Aparcería',
  otra: 'Otra',
};

/** Un inmueble ligado a la parcela, tal como se edita: la porción en m² puede quedar vacía. */
export interface LigaEnEdicion {
  inmuebleId: string | null;
  superficieM2: string | number;
}

/** Lo que muestra cada campo del formulario mientras se edita una parcela. */
export interface EdicionDeParcela {
  id: string | null;
  localidadId: string | null;
  parcelaMadreId: string | null;
  codigo: string;
  nombre: string;
  tipoId: string | null;
  formaDeTenencia: FormaDeTenencia;
  latitud: string | number;
  longitud: string | number;
  colindanciaNorte: string;
  colindanciaSur: string;
  colindanciaOriente: string;
  colindanciaPoniente: string;
  observaciones: string;
  inmuebles: LigaEnEdicion[];
  /** Registrar la primera medición junto con la parcela (solo al crear). */
  conMedicion: boolean;
}

/** Una parcela nueva, vacía; la localidad y la madre pueden venir ya elegidas (al agregar una subparcela). */
export function edicionDe(
  inicio: { localidadId?: string | null; parcelaMadreId?: string | null } = {},
): EdicionDeParcela {
  return {
    id: null,
    localidadId: inicio.localidadId ?? null,
    parcelaMadreId: inicio.parcelaMadreId ?? null,
    codigo: '',
    nombre: '',
    tipoId: null,
    formaDeTenencia: 'propia',
    latitud: '',
    longitud: '',
    colindanciaNorte: '',
    colindanciaSur: '',
    colindanciaOriente: '',
    colindanciaPoniente: '',
    observaciones: '',
    inmuebles: [],
    conMedicion: true,
  };
}

/** El formulario con los datos de una parcela que ya existe (sin la medición: esa se registra desde la ficha). */
export function edicionDeParcela(parcela: FichaDeParcela): EdicionDeParcela {
  return {
    id: parcela.id,
    localidadId: parcela.localidadId,
    parcelaMadreId: parcela.parcelaMadreId,
    codigo: parcela.codigo,
    nombre: parcela.nombre,
    tipoId: parcela.tipoId,
    formaDeTenencia: parcela.formaDeTenencia,
    latitud: textoDeEdicion(parcela.latitud),
    longitud: textoDeEdicion(parcela.longitud),
    colindanciaNorte: textoDeEdicion(parcela.colindanciaNorte),
    colindanciaSur: textoDeEdicion(parcela.colindanciaSur),
    colindanciaOriente: textoDeEdicion(parcela.colindanciaOriente),
    colindanciaPoniente: textoDeEdicion(parcela.colindanciaPoniente),
    observaciones: textoDeEdicion(parcela.observaciones),
    inmuebles: parcela.inmuebles.map((liga) => ({
      inmuebleId: liga.inmuebleId,
      superficieM2: textoDeEdicion(liga.superficieM2),
    })),
    conMedicion: false,
  };
}

/** Lo que se cambia de una parcela: lo vacío como `null` y los inmuebles sin filas a medio llenar. */
export const cambioDeParcela = (edicion: EdicionDeParcela): CambioDeParcela => ({
  tipoId: edicion.tipoId ?? '',
  nombre: edicion.nombre,
  formaDeTenencia: edicion.formaDeTenencia,
  latitud: textoONulo(edicion.latitud),
  longitud: textoONulo(edicion.longitud),
  colindanciaNorte: textoONulo(edicion.colindanciaNorte),
  colindanciaSur: textoONulo(edicion.colindanciaSur),
  colindanciaOriente: textoONulo(edicion.colindanciaOriente),
  colindanciaPoniente: textoONulo(edicion.colindanciaPoniente),
  observaciones: textoONulo(edicion.observaciones),
  inmuebles: edicion.inmuebles
    .filter((liga) => liga.inmuebleId)
    .map((liga) => ({ inmuebleId: liga.inmuebleId ?? '', superficieM2: textoONulo(liga.superficieM2) })),
});

/** Lo que se manda al crear: lo anterior, más dónde va, su código y, si se pidió, la primera medición. */
export const datosDeParcela = (edicion: EdicionDeParcela, medicion: EdicionDeMedicion): DatosDeParcela => ({
  ...cambioDeParcela(edicion),
  localidadId: edicion.localidadId ?? '',
  parcelaMadreId: edicion.parcelaMadreId,
  codigo: edicion.codigo,
  medicion: edicion.conMedicion ? datosDeMedicion(medicion) : null,
});

/**
 * Qué fila del servidor corresponde a una fila de la pantalla: `cambioDeParcela` no manda las filas sin inmueble, así
 * que `inmuebles.<n>` del servidor cuenta solo las que sí. `null` si esa fila no se mandó (no puede tener error).
 */
export function indiceEnviado(ligas: LigaEnEdicion[], indiceEnPantalla: number): number | null {
  if (!ligas[indiceEnPantalla]?.inmuebleId) return null;
  return ligas.slice(0, indiceEnPantalla).filter((liga) => liga.inmuebleId).length;
}

/** Una fila más para ligar un inmueble. */
export const ligaNueva = (): LigaEnEdicion => ({ inmuebleId: null, superficieM2: '' });

/** Lo que dice la confirmación de eliminar: sin registros se elimina; con ellos, el servidor lo impide y se inactiva. */
export const mensajeDeEliminacion = (nombre: string): string =>
  `Se eliminará la parcela «${nombre}». Si tiene subparcelas o mediciones no se podrá eliminar; en ese caso inactívela. Esta acción no se puede deshacer.`;

/** Lo que dice la confirmación de inactivar, con lo que pasa con sus subparcelas. */
export function mensajeDeInactivacion(nombre: string, hijasActivas: number): string {
  const subparcelas =
    hijasActivas > 0
      ? ` Tiene ${hijasActivas} ${hijasActivas === 1 ? 'subparcela activa' : 'subparcelas activas'}: inactívelas primero.`
      : '';
  return `Se inactivará la parcela «${nombre}»: deja de ofrecerse para trabajar, pero se conserva su historial y se puede reactivar.${subparcelas}`;
}
