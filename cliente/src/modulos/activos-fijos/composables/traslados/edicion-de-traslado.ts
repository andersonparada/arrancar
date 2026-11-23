import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { DatosDeTraslado } from '../../servicios/traslados.api';

/** Lo que se escribe al trasladar uno o varios activos con una sola boleta. */
export interface EdicionDeTraslado {
  fecha: string;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string;
  recibidoPor: string;
  motivo: string;
  aBodega: boolean;
  marcarOcioso: boolean;
}

/** Un activo que se traslada, tal como se lista en la ventana. */
export interface ActivoPorTrasladar {
  id: string;
  codigo: string;
  descripcion: string;
}

/** Los nombres elegidos del destino, para decirlos en la confirmación. */
export interface DestinoElegido {
  localidad: string | null;
  departamento: string | null;
}

/** El formulario vacío; `hoy` (`AAAA-MM-DD`) es la fecha que se propone. */
export const edicionDeTrasladoNueva = (hoy: string): EdicionDeTraslado => ({
  fecha: hoy,
  localidadId: null,
  departamentoId: null,
  responsable: '',
  recibidoPor: '',
  motivo: '',
  aBodega: false,
  marcarOcioso: false,
});

/** «Marcar como ocioso» solo vale al dejar el bien en la bodega: si se desmarca la bodega, se desmarca el ocio. */
export function alCambiarABodega(edicion: EdicionDeTraslado): void {
  if (!edicion.aBodega) edicion.marcarOcioso = false;
}

/** Lo que falla antes de mandar, por campo y con cómo corregirlo; el servidor revisa igual. */
export function erroresDeTraslado(edicion: EdicionDeTraslado): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Elija la fecha del traslado.';
  if (!edicion.recibidoPor.trim()) errores.recibidoPor = 'Escriba quién recibe: firma la boleta.';
  if (!edicion.motivo.trim()) errores.motivo = 'Escriba el motivo (por ejemplo: «Entrega al encargado de la finca»).';
  return errores;
}

/** Lo que se manda al servidor: lo vacío como `null` y la marca de ocio solo si va a la bodega. */
export function datosDeTraslado(activos: ActivoPorTrasladar[], edicion: EdicionDeTraslado): DatosDeTraslado {
  return {
    fecha: edicion.fecha,
    localidadId: edicion.localidadId,
    departamentoId: edicion.departamentoId,
    responsable: textoONulo(edicion.responsable),
    recibidoPor: edicion.recibidoPor.trim(),
    motivo: edicion.motivo.trim(),
    aBodega: edicion.aBodega,
    marcarOcioso: edicion.aBodega && edicion.marcarOcioso,
    renglones: activos.map(({ id }) => ({ activoId: id })),
  };
}

/** El número de la boleta como se imprime: año y correlativo (`2027-0012`). */
export const numeroDeBoleta = (numero: number, anio: number): string => `${anio}-${String(numero).padStart(4, '0')}`;

function descripcionDelDestino(edicion: EdicionDeTraslado, destino: DestinoElegido): string {
  const lugar = [destino.localidad, destino.departamento].filter(Boolean).join(' · ');
  const base = lugar || 'la misma localidad y departamento';
  return edicion.aBodega ? `la bodega de activos (${base})` : base;
}

/** Lo que pasará al trasladar, para confirmar: qué, adónde, quién recibe y qué documento se genera. */
export function mensajeDeTraslado(
  activos: ActivoPorTrasladar[],
  edicion: EdicionDeTraslado,
  destino: DestinoElegido,
): string {
  const que =
    activos.length === 1
      ? `${activos[0]?.codigo} · ${activos[0]?.descripcion} (con sus componentes, si los tiene)`
      : `${activos.length} activos (con sus componentes)`;
  const ocio = edicion.aBodega && edicion.marcarOcioso ? ' Quedan marcados como ociosos.' : '';
  return (
    `Se traslada ${que} a ${descripcionDelDestino(edicion, destino)}, con fecha ${formatearFecha(edicion.fecha)}. ` +
    `Recibe ${edicion.recibidoPor.trim()}.${ocio} Se genera la boleta numerada, lista para imprimir y firmar.`
  );
}
