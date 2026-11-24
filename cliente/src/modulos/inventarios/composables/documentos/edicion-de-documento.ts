import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { CausaDeEntrada, DatosDeEntrada, DatosDeSalida, DestinoDeSalida } from '../../servicios/documentos.api';
import { fechaDeHoy } from '../compartido/fechas';
import { renglonesSolicitados, renglonNuevo, type EdicionDeRenglon } from './edicion-de-renglones';

/** La entrada manual mientras se escribe. */
export interface EdicionDeEntrada {
  fecha: string;
  bodegaId: string | null;
  causa: CausaDeEntrada | null;
  soporte: string;
  observaciones: string;
  renglones: EdicionDeRenglon[];
}

/** La salida por consumo mientras se escribe. */
export interface EdicionDeSalida {
  fecha: string;
  bodegaId: string | null;
  destino: DestinoDeSalida;
  conceptoDeGastoId: string | null;
  localidadId: string | null;
  departamentoId: string | null;
  entregadoA: string;
  observaciones: string;
  renglones: EdicionDeRenglon[];
}

export const entradaNueva = (hoy: string = fechaDeHoy()): EdicionDeEntrada => ({
  fecha: hoy,
  bodegaId: null,
  causa: null,
  soporte: '',
  observaciones: '',
  renglones: [renglonNuevo()],
});

export const salidaNueva = (hoy: string = fechaDeHoy()): EdicionDeSalida => ({
  fecha: hoy,
  bodegaId: null,
  destino: 'gasto',
  conceptoDeGastoId: null,
  localidadId: null,
  departamentoId: null,
  entregadoA: '',
  observaciones: '',
  renglones: [renglonNuevo()],
});

/** Lo que se manda para la entrada. Lo no elegido viaja vacío y el servidor dice qué falta. */
export const datosDeEntrada = (edicion: EdicionDeEntrada): DatosDeEntrada => ({
  fecha: edicion.fecha,
  bodegaId: edicion.bodegaId ?? '',
  causa: edicion.causa ?? ('' as CausaDeEntrada),
  soporte: edicion.soporte.trim(),
  observaciones: textoONulo(edicion.observaciones),
  renglones: renglonesSolicitados(edicion.renglones, true),
});

export const datosDeSalida = (edicion: EdicionDeSalida): DatosDeSalida => ({
  fecha: edicion.fecha,
  bodegaId: edicion.bodegaId ?? '',
  destino: edicion.destino,
  conceptoDeGastoId: edicion.conceptoDeGastoId,
  localidadId: edicion.localidadId,
  departamentoId: edicion.departamentoId,
  entregadoA: textoONulo(edicion.entregadoA),
  observaciones: textoONulo(edicion.observaciones),
  renglones: renglonesSolicitados(edicion.renglones, false),
});

/** Los campos del encabezado que faltan, con el mensaje que dice qué hacer. */
export function erroresDeEntrada(edicion: EdicionDeEntrada): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la entrada.';
  if (!edicion.bodegaId) errores.bodegaId = 'Elija la bodega que recibe.';
  if (!edicion.causa) errores.causa = 'Elija por qué entra la mercadería.';
  if (!edicion.soporte.trim()) errores.soporte = 'Anote el soporte: acta, boleta o número que respalda la entrada.';
  return errores;
}

export function erroresDeSalida(edicion: EdicionDeSalida): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la salida.';
  if (!edicion.bodegaId) errores.bodegaId = 'Elija la bodega de la que sale.';
  if (edicion.destino === 'gasto' && !edicion.conceptoDeGastoId) {
    errores.conceptoDeGastoId = 'Elija el concepto de gasto: de ahí sale la cuenta contable del consumo.';
  }
  return errores;
}

/** ¿Es una donación? Se avisa el costo (valor razonable) antes de escribirlo. */
export const esDonacion = (edicion: EdicionDeEntrada): boolean => edicion.causa === 'donacion_recibida';
