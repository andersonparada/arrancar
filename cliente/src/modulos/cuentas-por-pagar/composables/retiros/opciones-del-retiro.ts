import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { Usuario } from '@/modulos/core/servicios/usuarios.api';
import type { MediosDePago } from '../../servicios/tipos-de-pagos';
import type { FormaDeRetiro } from '../../servicios/tipos-de-retiros';
import { opcionesDeChequeras, opcionesDeCuentas } from '../pagos/opciones-del-pago';

/** El nombre completo de un usuario, como se escribe de custodio. */
export const nombreDelUsuario = (usuario: Pick<Usuario, 'nombres' | 'apellidos'>): string =>
  `${usuario.nombres} ${usuario.apellidos}`.trim();

/**
 * Los usuarios que pueden ser custodios: activos y con acceso a la empresa activa (el servidor revisa lo mismo). La primera
 * opción es «no es usuario»: el custodio se escribe a mano.
 */
export function opcionesDeCustodios(usuarios: readonly Usuario[], empresaId: string | null): OpcionBuscable<string>[] {
  const posibles = usuarios
    .filter(({ activo, empresas }) => activo && empresas.some((empresa) => empresa.empresaId === empresaId))
    .map((usuario) => ({ valor: usuario.id, texto: `${nombreDelUsuario(usuario)} (${usuario.usuario})` }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'No es usuario de Arrancar: escribir el nombre' }, ...posibles];
}

/** La chequera (cheque) o la cuenta (nota de débito) si solo hay una que se pueda usar; si no, hay que escoger. */
export function medioPorOmision(forma: FormaDeRetiro, medios: MediosDePago | null): string {
  const opciones = forma === 'cheque' ? opcionesDeChequeras(medios) : opcionesDeCuentas(medios);
  const libres = opciones.filter(({ deshabilitada }) => !deshabilitada);
  return libres.length === 1 ? libres[0]!.valor : '';
}
