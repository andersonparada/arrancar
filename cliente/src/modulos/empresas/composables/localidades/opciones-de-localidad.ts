import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

const alfabetico = (a: OpcionDeRegistro, b: OpcionDeRegistro) => a.texto.localeCompare(b.texto, 'es');

/**
 * Los tipos que se pueden elegir: solo los activos, por nombre. Si la localidad ya
 * tiene un tipo que se inactivó, se conserva para no perderlo al editar.
 */
export function opcionesDeTipos(
  tipos: { id: string; nombre: string; activo: boolean }[],
  tipoActual: string | null,
): OpcionDeRegistro[] {
  const elegibles = tipos.filter((tipo) => tipo.activo || tipo.id === tipoActual);
  const opciones = elegibles.map((tipo) => ({ valor: tipo.id, texto: tipo.nombre })).sort(alfabetico);
  return [{ valor: null, texto: 'Elija una opción' }, ...opciones];
}

/** Departamentos o municipios para un selector opcional, por nombre. */
export function opcionesDeGeografia(registros: { codigo: string; nombre: string }[]): OpcionDeRegistro[] {
  const opciones = registros.map((r) => ({ valor: r.codigo, texto: r.nombre })).sort(alfabetico);
  return [{ valor: null, texto: 'Sin registrar' }, ...opciones];
}
