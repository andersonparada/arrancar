import { createHash, randomBytes } from 'node:crypto';
import { configuracion } from '../../../configuracion.js';
import { ErrorNoAutenticado } from '../errores/errores.js';
import { sesionesRepositorio, type SesionConUsuario } from '../repositorios/sesiones.repositorio.js';
import { cifradorDeContrasenas, usuariosSinTransaccion } from '../identidad/contexto.js';
import { NombreDeUsuario, NombreDeUsuarioInvalido } from '../identidad/dominio/nombre-de-usuario.js';
import type { Usuario } from '../identidad/dominio/usuario.js';

const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Un nombre mal escrito no existe: responde igual que un usuario desconocido. */
async function buscarUsuario(texto: string): Promise<Usuario | null> {
  try {
    return await usuariosSinTransaccion.buscarPorNombre(NombreDeUsuario.crear(texto));
  } catch (error) {
    if (error instanceof NombreDeUsuarioInvalido) return null;
    throw error;
  }
}

export interface DatosInicioSesion {
  usuario: string;
  contrasena: string;
  direccionIp: string | null;
  agenteUsuario: string | null;
}

export interface SesionCreada {
  token: string;
  expiraEn: Date;
}

function calcularHashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function calcularVencimiento(): Date {
  return new Date(Date.now() + configuracion.DURACION_SESION_DIAS * MILISEGUNDOS_POR_DIA);
}

export const autenticacionServicio = {
  /**
   * Valida las credenciales y abre una sesión.
   * @returns el token en claro, que solo viaja en la cookie; en la base se guarda su hash.
   * @throws ErrorNoAutenticado con un mensaje genérico si el usuario o la contraseña no coinciden.
   */
  async iniciarSesion(datos: DatosInicioSesion): Promise<SesionCreada> {
    const usuario = await buscarUsuario(datos.usuario);
    const hashGuardado = usuario?.instantanea().hashContrasena ?? null;
    const contrasenaValida = await cifradorDeContrasenas.coincide(hashGuardado, datos.contrasena);
    if (!usuario || !contrasenaValida || !usuario.activo) {
      throw new ErrorNoAutenticado('Usuario o contraseña incorrectos.');
    }

    const token = randomBytes(32).toString('base64url');
    const expiraEn = calcularVencimiento();
    await sesionesRepositorio.crear({
      hashToken: calcularHashToken(token),
      usuarioId: usuario.id.valor,
      direccionIp: datos.direccionIp,
      agenteUsuario: datos.agenteUsuario?.slice(0, 300) ?? null,
      expiraEn,
    });
    await usuariosSinTransaccion.registrarAcceso(usuario.id);
    return { token, expiraEn };
  },

  async cerrarSesion(token: string): Promise<void> {
    await sesionesRepositorio.eliminarPorHash(calcularHashToken(token));
  },

  /**
   * Busca la sesión del token. Si ya consumió más de la mitad de su duración,
   * la renueva para que un usuario activo no tenga que volver a entrar.
   */
  async validarToken(token: string): Promise<(SesionConUsuario & { renovada: boolean }) | undefined> {
    const sesion = await sesionesRepositorio.buscarVigentePorHash(calcularHashToken(token));
    if (!sesion) return undefined;

    const mitadDeLaDuracion = (configuracion.DURACION_SESION_DIAS * MILISEGUNDOS_POR_DIA) / 2;
    if (sesion.expiraEn.getTime() - Date.now() >= mitadDeLaDuracion) return { ...sesion, renovada: false };

    const expiraEn = calcularVencimiento();
    await sesionesRepositorio.extender(sesion.sesionId, expiraEn);
    return { ...sesion, expiraEn, renovada: true };
  },
};
