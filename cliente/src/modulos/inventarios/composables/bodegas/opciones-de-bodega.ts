import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { UsuarioParaAccesos } from '../../servicios/accesos-a-bodegas.api';
import type { LocalidadParaElegir } from '../../servicios/ubicaciones.api';
import { nombreDeUsuario } from './edicion-de-accesos';

const SIN_ELEGIR: OpcionDeRegistro = { valor: null, texto: 'Sin elegir' };
const porTexto = (a: OpcionDeRegistro, b: OpcionDeRegistro) => a.texto.localeCompare(b.texto, 'es');

/** Las localidades activas por nombre; la que ya tiene la bodega se conserva aunque esté inactiva. */
export function opcionesDeLocalidades(localidades: LocalidadParaElegir[], actualId: string | null): OpcionDeRegistro[] {
  const opciones = localidades
    .filter((localidad) => localidad.activo || localidad.id === actualId)
    .map((localidad) => ({
      valor: localidad.id,
      texto: localidad.activo ? localidad.nombre : `${localidad.nombre} (inactiva)`,
    }))
    .sort(porTexto);
  return [SIN_ELEGIR, ...opciones];
}

/** Los usuarios que pueden ser responsables, por nombre. */
export function opcionesDeResponsables(usuarios: UsuarioParaAccesos[]): OpcionDeRegistro[] {
  const opciones = usuarios.map((usuario) => ({ valor: usuario.usuarioId, texto: nombreDeUsuario(usuario) }));
  return [SIN_ELEGIR, ...opciones.sort(porTexto)];
}
