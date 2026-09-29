import type { CambiosUsuario, DatosNuevoUsuario, Usuario } from '../../servicios/usuarios.api';

export interface EdicionDeUsuario {
  abierta: boolean;
  usuarioId: string | null;
  nombres: string;
  apellidos: string;
  usuario: string;
  /** Deja de sugerir en cuanto el administrador escribe el usuario a mano. */
  usuarioEscritoAMano: boolean;
  correo: string;
  contrasena: string;
  activo: boolean;
  /** Las empresas a las que entra. */
  empresaIds: string[];
  /** Solo al crear: roles y permisos directos iniciales (después se cambian en la página de permisos). */
  rolIds: string[];
  permisos: string[];
}

export const nombreCompleto = ({ nombres, apellidos }: Pick<Usuario, 'nombres' | 'apellidos'>) =>
  `${nombres} ${apellidos}`.trim();

const USUARIO_NUEVO = { usuarioId: null, nombres: '', apellidos: '', usuario: '', correo: '', activo: true };

const datosDe = (usuario: Usuario) => ({
  usuarioId: usuario.id,
  nombres: usuario.nombres,
  apellidos: usuario.apellidos,
  usuario: usuario.usuario,
  correo: usuario.correo ?? '',
  activo: usuario.activo,
});

/**
 * La ventana abierta con los datos del usuario, o vacía si es nuevo (entrando a la empresa activa,
 * que es lo más común).
 */
export function edicionDe(empresaActivaId: string | null, usuario?: Usuario): EdicionDeUsuario {
  const nuevas = empresaActivaId ? [empresaActivaId] : [];
  return {
    ...(usuario ? datosDe(usuario) : USUARIO_NUEVO),
    abierta: true,
    usuarioEscritoAMano: false,
    contrasena: '',
    empresaIds: usuario ? usuario.empresas.map((empresa) => empresa.empresaId) : nuevas,
    rolIds: [],
    permisos: [],
  };
}

/** Los roles y permisos iniciales solo van si el operador puede asignarlos y eligió alguno. */
const asignacionesIniciales = (edicion: EdicionDeUsuario, puedeAsignar: boolean) =>
  puedeAsignar
    ? {
        ...(edicion.rolIds.length ? { rolIds: edicion.rolIds } : {}),
        ...(edicion.permisos.length ? { permisos: edicion.permisos } : {}),
      }
    : {};

export const datosDelNuevoUsuario = (edicion: EdicionDeUsuario, puedeAsignar: boolean): DatosNuevoUsuario => ({
  nombres: edicion.nombres,
  apellidos: edicion.apellidos,
  usuario: edicion.usuario || undefined,
  correo: edicion.correo || null,
  contrasena: edicion.contrasena,
  empresaIds: edicion.empresaIds,
  ...asignacionesIniciales(edicion, puedeAsignar),
});

/** Nadie cambia su propio estado ni sus empresas: al editarse a sí mismo solo van sus datos. */
export function cambiosDelUsuario(edicion: EdicionDeUsuario, esElMismo: boolean): CambiosUsuario {
  const datos = { nombres: edicion.nombres, apellidos: edicion.apellidos, correo: edicion.correo || null };
  return esElMismo ? datos : { ...datos, activo: edicion.activo, empresaIds: edicion.empresaIds };
}

/** El usuario para iniciar sesión solo lleva letras minúsculas sin tilde. */
export const usuarioLimpio = (valor: unknown) =>
  String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
