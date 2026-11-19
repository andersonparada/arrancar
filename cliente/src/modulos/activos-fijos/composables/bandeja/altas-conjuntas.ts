import type { Activo } from '../../servicios/activos.api';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/** Una compra conjunta: los activos que se crearon juntos desde una misma asignación de la bandeja. */
export interface AltaConjunta {
  id: string;
  activos: Activo[];
}

/** Las altas conjuntas con más de un activo vigente (no dado de baja); un activo solo no es «conjunta». */
export function altasConjuntasDe(activos: readonly Activo[]): AltaConjunta[] {
  const altas = new Map<string, Activo[]>();
  for (const activo of activos) {
    if (!activo.altaConjuntaId || activo.estado === 'dado_de_baja') continue;
    altas.set(activo.altaConjuntaId, [...(altas.get(activo.altaConjuntaId) ?? []), activo]);
  }
  return [...altas].filter(([, lista]) => lista.length > 1).map(([id, lista]) => ({ id, activos: lista }));
}

/** «AF-0101 a AF-0103 · Tractor (3 activos)»: se reconoce por su primer activo y cuántos son. */
export function nombreDeAlta(alta: AltaConjunta): string {
  const codigos = alta.activos.map(({ codigo }) => codigo).sort((a, b) => a.localeCompare(b));
  const primero = alta.activos.find(({ codigo }) => codigo === codigos[0]);
  return `${codigos[0]} a ${codigos[codigos.length - 1]} · ${primero?.descripcion ?? ''} (${codigos.length} activos)`;
}

/** Las altas como opciones de un selector, ordenadas por nombre. */
export function opcionesDeAltas(altas: readonly AltaConjunta[]): OpcionDeRegistro[] {
  const opciones = altas.map((alta) => ({ valor: alta.id, texto: nombreDeAlta(alta) }));
  opciones.sort((a, b) => a.texto.localeCompare(b.texto));
  return [{ valor: null, texto: 'Elija una compra conjunta' }, ...opciones];
}
