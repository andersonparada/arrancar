import { formatearFecha, formatearFechaHora } from '@/modulos/core/utilidades/formato';
import type { AccionDelHistorial, CargaInicial, EntradaDelHistorial } from '../servicios/cierre-de-carga.tipos';

const diferencias = (n: number) => (n === 1 ? '1 diferencia' : `${n} diferencias`);

/**
 * La línea de la sección tras cerrar: «Cerrada el dd/mm/aaaa por X, con N diferencias: motivo».
 * `null` mientras la carga está abierta.
 */
export function textoDelUltimoCierre(carga: CargaInicial): string | null {
  if (!carga.cerrada || !carga.cerradaEn) return null;
  const inicio = `Cerrada el ${formatearFecha(carga.cerradaEn)}${carga.cerradaPor ? ` por ${carga.cerradaPor}` : ''}`;
  const cierre = carga.ultimoCierre;
  if (!cierre?.revisionGuardada) return `${inicio} (antes de que se guardara la revisión).`;
  const cuantas = cierre.diferencias === 0 ? 'sin diferencias' : `con ${diferencias(cierre.diferencias)}`;
  return `${inicio}, ${cuantas}${cierre.motivo ? `: ${cierre.motivo}` : '.'}`;
}

/** Los avisos que dejó el último cierre, como «y 2 avisos»; vacío si no hubo o no hay revisión guardada. */
export function textoDeAvisosDelCierre(carga: CargaInicial): string {
  const avisos = carga.ultimoCierre?.avisos ?? 0;
  if (!carga.ultimoCierre?.revisionGuardada || avisos === 0) return '';
  return avisos === 1 ? 'Además quedó 1 aviso.' : `Además quedaron ${avisos} avisos.`;
}

const TITULO_DE_ACCION: Record<AccionDelHistorial, string> = {
  cerrar: 'Cierre',
  reabrir: 'Reapertura',
  quitar: 'Balance de apertura quitado',
  adjuntar: 'Balance de apertura adjuntado',
};

/** Una entrada del historial lista para mostrar: título, quién y cuándo, detalle y si se puede abrir su revisión. */
export interface LineaDelHistorial {
  id: string;
  titulo: string;
  cuando: string;
  detalle: string | null;
  motivo: string | null;
  conRevision: boolean;
}

function detalleDelCierre({ diferencias: d, avisos: a }: EntradaDelHistorial): string {
  const partes = [d === 0 || d === null ? 'sin diferencias' : diferencias(d)];
  if (a) partes.push(a === 1 ? '1 aviso' : `${a} avisos`);
  return partes.join(', ');
}

export function lineaDelHistorial(entrada: EntradaDelHistorial): LineaDelHistorial {
  const esCierre = entrada.accion === 'cerrar';
  return {
    id: entrada.id,
    titulo: TITULO_DE_ACCION[entrada.accion],
    cuando: `${formatearFechaHora(entrada.fecha)}${entrada.porNombre ? ` · ${entrada.porNombre}` : ''}`,
    detalle: esCierre ? detalleDelCierre(entrada) : null,
    motivo: entrada.motivo,
    conRevision: esCierre,
  };
}

/** El cierre más reciente del historial (viene de la más nueva a la más vieja). */
export const ultimoCierreDelHistorial = (entradas: EntradaDelHistorial[]): EntradaDelHistorial | null =>
  entradas.find((entrada) => entrada.accion === 'cerrar') ?? null;
