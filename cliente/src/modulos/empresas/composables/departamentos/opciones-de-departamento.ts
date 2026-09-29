import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';

/**
 * Las localidades que se pueden elegir: solo las activas que el usuario ve, por nombre,
 * y «Sin localidad» primero (el departamento puede no depender de una). Si el departamento
 * ya tiene una localidad que se inactivó, se conserva para no perderla al editar.
 */
export function opcionesDeLocalidades(
  localidades: { id: string; nombre: string; activo: boolean }[],
  localidadActual: string | null,
): OpcionDeRegistro[] {
  const opciones = localidades
    .filter((localidad) => localidad.activo || localidad.id === localidadActual)
    .map((localidad) => ({ valor: localidad.id, texto: localidad.nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return [{ valor: null, texto: 'Sin localidad' }, ...opciones];
}
