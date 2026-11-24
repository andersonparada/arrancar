import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/**
 * Las opciones de un filtro: «Todas…» primero y luego los registros por nombre. En un filtro se ofrecen también los
 * inactivos, porque lo que ya se movió en ellos se sigue consultando.
 */
export function opcionesDeFiltro(
  registros: { id: string; nombre: string; activo?: boolean }[],
  textoDeTodos: string,
): OpcionDeRegistro[] {
  const opciones = registros
    .map((registro) => ({
      valor: registro.id as string | null,
      texto: registro.activo === false ? `${registro.nombre} (inactiva)` : registro.nombre,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return [{ valor: null, texto: textoDeTodos }, ...opciones];
}

/** Los filtros de una consulta sin los vacíos: el servidor no recibe parámetros en blanco. */
export function filtrosSinVacios<Filtros extends object>(filtros: Filtros): Partial<Filtros> {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== null && valor !== undefined && valor !== ''),
  ) as Partial<Filtros>;
}
