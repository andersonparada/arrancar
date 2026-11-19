import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { FondoParaAsignar, UsuarioParaAccesosAFondos } from '../../servicios/accesos-a-fondos.api';

/** Agrega o quita un fondo de la selección, sin tocar la original. */
export const alternarFondo = (seleccion: string[], id: string): string[] =>
  seleccion.includes(id) ? seleccion.filter((actual) => actual !== id) : [...seleccion, id];

/** Marca todos los fondos dados, o los desmarca (los demás de la selección se conservan). */
export function marcarTodos(seleccion: string[], ids: string[], marcar: boolean): string[] {
  const resto = seleccion.filter((id) => !ids.includes(id));
  return marcar ? [...resto, ...ids] : resto;
}

const plural = (n: number) => (n === 1 ? '1 fondo' : `${n} fondos`);

/** Resumen de lo que hará guardar, o `null` si no hay cambios. */
export function resumenDeCambios(original: string[], actual: string[]): string | null {
  const agregados = actual.filter((id) => !original.includes(id)).length;
  const quitados = original.filter((id) => !actual.includes(id)).length;
  const partes = [];
  if (agregados) partes.push(`se dará acceso a ${plural(agregados)}`);
  if (quitados) partes.push(`se quitará el acceso a ${plural(quitados)}`);
  if (!partes.length) return null;
  const texto = partes.join(' y ');
  return texto.charAt(0).toUpperCase() + texto.slice(1) + '.';
}

export const nombreDeUsuario = (u: UsuarioParaAccesosAFondos): string =>
  `${u.nombres} ${u.apellidos}`.trim() + ` (${u.usuario})`;

/** Los usuarios para el selector, por nombre; el propio operador se marca con «(usted)». */
export function opcionesDeUsuarios(usuarios: UsuarioParaAccesosAFondos[], propioId: string | null): OpcionDeRegistro[] {
  const opciones = usuarios.map((u) => ({
    valor: u.usuarioId,
    texto: nombreDeUsuario(u) + (u.usuarioId === propioId ? ' (usted)' : ''),
  }));
  opciones.sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return [{ valor: null, texto: 'Elija un usuario' }, ...opciones];
}

/** Los fondos por nombre. */
export const fondosPorNombre = (fondos: FondoParaAsignar[]): FondoParaAsignar[] =>
  [...fondos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
