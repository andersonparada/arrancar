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
  /** Dónde está hoy; con un solo activo, el formulario parte de aquí. */
  localidadId?: string | null;
  departamentoId?: string | null;
  responsable?: string | null;
  /** Si hoy está en la bodega; con un solo activo, el formulario conserva ese estado. */
  enBodega?: boolean;
}

/** Los nombres elegidos del destino, para decirlos en la confirmación. */
export interface DestinoElegido {
  localidad: string | null;
  departamento: string | null;
}

function ubicacionActual(activos: ActivoPorTrasladar[]) {
  const unico = activos.length === 1 ? activos[0] : undefined;
  if (!unico) return { localidadId: null, departamentoId: null, responsable: '', aBodega: false };
  return {
    localidadId: unico.localidadId ?? null,
    departamentoId: unico.departamentoId ?? null,
    responsable: unico.responsable ?? '',
    aBodega: unico.enBodega === true,
  };
}

/**
 * El formulario nuevo; `hoy` (`AAAA-MM-DD`) es la fecha que se propone. Con un solo activo parte de su localidad,
 * departamento, responsable y estado de bodega actuales: el traslado reemplaza la ubicación completa, así que lo que no se cambia se
 * conserva. Con varios, el destino parte vacío y hay que elegirlo.
 */
export const edicionDeTrasladoNueva = (hoy: string, activos: ActivoPorTrasladar[] = []): EdicionDeTraslado => {
  const actual = ubicacionActual(activos);
  return {
    fecha: hoy,
    ...actual,
    recibidoPor: '',
    motivo: '',
    marcarOcioso: false,
  };
};

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

function nombreDeLugar(id: string | null, nombre: string | null, sin: string): string {
  if (nombre) return nombre;
  return id ? 'la ubicación indicada' : sin;
}

/** Dice exactamente qué queda: el traslado reemplaza localidad, departamento y responsable por lo escrito. */
function descripcionDelDestino(edicion: EdicionDeTraslado, destino: DestinoElegido): string {
  const localidad = nombreDeLugar(edicion.localidadId, destino.localidad, 'sin localidad');
  const departamento = nombreDeLugar(edicion.departamentoId, destino.departamento, 'sin departamento');
  const lugar = `${localidad} · ${departamento}`;
  return edicion.aBodega ? `la bodega de activos (${lugar})` : lugar;
}

const textoDelResponsable = (edicion: EdicionDeTraslado): string =>
  edicion.responsable.trim()
    ? `El responsable del bien queda: ${edicion.responsable.trim()}.`
    : 'Queda sin responsable.';

function avisoDeSalidaDeBodega(activos: ActivoPorTrasladar[], edicion: EdicionDeTraslado): string {
  const sale = activos.length === 1 && activos[0]?.enBodega === true && !edicion.aBodega;
  return sale ? ' El bien sale de la bodega de activos.' : '';
}

function descripcionDeLoTrasladado(activos: ActivoPorTrasladar[]): string {
  if (activos.length !== 1) return `${activos.length} activos (con sus componentes)`;
  return `${activos[0]?.codigo} · ${activos[0]?.descripcion} (con sus componentes, si los tiene)`;
}

/** Lo que pasará al trasladar, para confirmar: qué, adónde, quién recibe y qué documento se genera. */
export function mensajeDeTraslado(
  activos: ActivoPorTrasladar[],
  edicion: EdicionDeTraslado,
  destino: DestinoElegido,
): string {
  const que = descripcionDeLoTrasladado(activos);
  const salida = avisoDeSalidaDeBodega(activos, edicion);
  const ocio = edicion.aBodega && edicion.marcarOcioso ? ' Quedan marcados como ociosos.' : '';
  return (
    `Se traslada ${que} a ${descripcionDelDestino(edicion, destino)}, con fecha ${formatearFecha(edicion.fecha)}. ` +
    `${textoDelResponsable(edicion)} Recibe ${edicion.recibidoPor.trim()}.${ocio}${salida} Se genera la boleta numerada, lista para imprimir y firmar.`
  );
}
