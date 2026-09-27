import type { AccesoSolicitado, CambiosUsuario, DatosNuevoUsuario, Usuario } from '../../servicios/usuarios.api';

/** Valor del selector de rol cuando el usuario no entra a esa empresa. */
export const SIN_ACCESO = '';

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
  rolPorEmpresa: Record<string, string>;
}

export const nombreCompleto = ({ nombres, apellidos }: Pick<Usuario, 'nombres' | 'apellidos'>) =>
  `${nombres} ${apellidos}`.trim();

const rolEn = (empresaId: string, usuario?: Usuario) =>
  usuario?.accesos.find((acceso) => acceso.empresaId === empresaId)?.rolId ?? SIN_ACCESO;

const USUARIO_NUEVO = { usuarioId: null, nombres: '', apellidos: '', usuario: '', correo: '', activo: true };

const datosDe = (usuario: Usuario) => ({
  usuarioId: usuario.id,
  nombres: usuario.nombres,
  apellidos: usuario.apellidos,
  usuario: usuario.usuario,
  correo: usuario.correo ?? '',
  activo: usuario.activo,
});

/** La ventana abierta con los datos del usuario, o vacía si es nuevo; un selector de rol por empresa. */
export function edicionDe(empresaIds: string[], usuario?: Usuario): EdicionDeUsuario {
  return {
    ...(usuario ? datosDe(usuario) : USUARIO_NUEVO),
    abierta: true,
    usuarioEscritoAMano: false,
    contrasena: '',
    rolPorEmpresa: Object.fromEntries(empresaIds.map((id) => [id, rolEn(id, usuario)])),
  };
}

export const accesosElegidos = (rolPorEmpresa: Record<string, string>): AccesoSolicitado[] =>
  Object.entries(rolPorEmpresa)
    .filter(([, rolId]) => rolId !== SIN_ACCESO)
    .map(([empresaId, rolId]) => ({ empresaId, rolId }));

export const datosDelNuevoUsuario = (edicion: EdicionDeUsuario): DatosNuevoUsuario => ({
  nombres: edicion.nombres,
  apellidos: edicion.apellidos,
  usuario: edicion.usuario || undefined,
  correo: edicion.correo || null,
  contrasena: edicion.contrasena,
  accesos: accesosElegidos(edicion.rolPorEmpresa),
});

/** Nadie cambia su propio estado ni sus accesos: al editarse a sí mismo solo van sus datos. */
export function cambiosDelUsuario(edicion: EdicionDeUsuario, esElMismo: boolean): CambiosUsuario {
  const datos = { nombres: edicion.nombres, apellidos: edicion.apellidos, correo: edicion.correo || null };
  return esElMismo ? datos : { ...datos, activo: edicion.activo, accesos: accesosElegidos(edicion.rolPorEmpresa) };
}

/** El usuario para iniciar sesión solo lleva letras minúsculas sin tilde. */
export const usuarioLimpio = (valor: unknown) =>
  String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
