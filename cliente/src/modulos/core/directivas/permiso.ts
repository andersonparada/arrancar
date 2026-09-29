import type { Directive } from 'vue';
import { usarSesion } from '../almacenes/sesion';

function aplicar(elemento: HTMLElement, permiso: string): void {
  elemento.hidden = !usarSesion().puede(permiso);
}

/**
 * Oculta el elemento si el usuario no tiene el permiso.
 * Es solo presentación: el servidor valida el mismo permiso en cada acción.
 * @example <BotonBase v-permiso="'usuarios.eliminar'">Eliminar</BotonBase>
 */
export const vPermiso: Directive<HTMLElement, string> = {
  mounted: (elemento, { value }) => aplicar(elemento, value),
  updated: (elemento, { value }) => aplicar(elemento, value),
};
