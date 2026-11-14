import { numeroDeContrasena } from './contrasena.js';
import { etiquetaDe, type ContrasenaVigente, type DocumentoPorPagar } from './documento-por-pagar.js';
import { NotaEnContrasena } from './errores-de-aplicaciones.js';

/**
 * Una nota dentro de una contraseña vigente no cambia su saldo libre (ni aplicándolo, ni ajustándolo, ni quitando una
 * aplicación manual): la contraseña ya lo repartió y el proveedor tiene el papel.
 * @throws NotaEnContrasena si la nota está en una contraseña vigente.
 */
export function exigirNotaFueraDeContrasena(nota: DocumentoPorPagar, contrasena: ContrasenaVigente | null): void {
  if (!contrasena) return;
  throw new NotaEnContrasena(etiquetaDe(nota), numeroDeContrasena(contrasena.numero, contrasena.anioDeNumero));
}
