import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { UsuarioParaAccesos } from '../../servicios/accesos-a-localidades.api';

/** Agrega o quita una localidad de la selección, sin tocar la original. */
export const alternarLocalidad = (seleccion: string[], id: string): string[] =>
  seleccion.includes(id) ? seleccion.filter((actual) => actual !== id) : [...seleccion, id];

/** Marca todas las localidades dadas, o las desmarca (las demás de la selección se conservan). */
export function marcarTodas(seleccion: string[], ids: string[], marcar: boolean): string[] {
  const resto = seleccion.filter((id) => !ids.includes(id));
  return marcar ? [...resto, ...ids] : resto;
}

/** Qué localidades se agregan y cuáles se quitan al pasar de `original` a `actual`. */
export function diferenciaDeAccesos(original: string[], actual: string[]) {
  return {
    agregadas: actual.filter((id) => !original.includes(id)),
    quitadas: original.filter((id) => !actual.includes(id)),
  };
}

const plural = (n: number) => (n === 1 ? '1 localidad' : `${n} localidades`);

/** Resumen de lo que hará guardar, o `null` si no hay cambios. */
export function resumenDeCambios(original: string[], actual: string[]): string | null {
  const { agregadas, quitadas } = diferenciaDeAccesos(original, actual);
  const partes = [];
  if (agregadas.length) partes.push(`se dará acceso a ${plural(agregadas.length)}`);
  if (quitadas.length) partes.push(`se quitará el acceso a ${plural(quitadas.length)}`);
  if (!partes.length) return null;
  const texto = partes.join(' y ');
  return texto.charAt(0).toUpperCase() + texto.slice(1) + '.';
}

/** Nombre completo del usuario con su nombre de usuario entre paréntesis. */
export const nombreDeUsuario = (u: UsuarioParaAccesos): string =>
  `${u.nombres} ${u.apellidos}`.trim() + ` (${u.usuario})`;

/** Los usuarios para el selector, por nombre; el propio operador se marca con «(usted)». */
export function opcionesDeUsuarios(usuarios: UsuarioParaAccesos[], propioId: string | null): OpcionDeRegistro[] {
  const opciones = usuarios.map((u) => ({
    valor: u.usuarioId,
    texto: nombreDeUsuario(u) + (u.usuarioId === propioId ? ' (usted)' : ''),
  }));
  opciones.sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return [{ valor: null, texto: 'Elija un usuario' }, ...opciones];
}

/** Ordena las localidades por nombre. */
export const porNombre = <T extends { nombre: string }>(registros: T[]): T[] =>
  [...registros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
