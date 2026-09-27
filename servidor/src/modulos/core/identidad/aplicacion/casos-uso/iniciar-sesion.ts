import { NoAutenticado } from '../../../compartido/aplicacion/errores.js';
import { NombreDeUsuario, NombreDeUsuarioInvalido } from '../../dominio/nombre-de-usuario.js';
import type { Usuario } from '../../dominio/usuario.js';
import type { VigenciaDeSesion } from '../../dominio/vigencia-de-sesion.js';
import type { CifradorDeContrasenas } from '../puertos/cifrador-de-contrasenas.js';
import type { RepositorioSesiones, TokensDeSesion } from '../puertos/repositorio-sesiones.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';

interface Dependencias {
  usuarios: RepositorioUsuarios;
  cifrador: CifradorDeContrasenas;
  sesiones: RepositorioSesiones;
  tokens: TokensDeSesion;
  vigencia: VigenciaDeSesion;
}

export interface Credenciales {
  usuario: string;
  contrasena: string;
  direccionIp: string | null;
  agenteUsuario: string | null;
}

export interface SesionAbierta {
  /** En claro: solo viaja en la cookie. */
  token: string;
  expiraEn: Date;
}

const LARGO_MAXIMO_DEL_AGENTE = 300;

export class IniciarSesion {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws NoAutenticado con el mismo mensaje sea cual sea el dato que no coincide. */
  async ejecutar(credenciales: Credenciales): Promise<SesionAbierta> {
    const { cifrador, sesiones, tokens, vigencia } = this.dependencias;
    const usuario = await this.buscar(credenciales.usuario);
    const coincide = await cifrador.coincide(usuario?.instantanea().hashContrasena ?? null, credenciales.contrasena);
    if (!usuario || !coincide || !usuario.activo) throw new NoAutenticado('Usuario o contraseña incorrectos.');

    const token = tokens.nuevo();
    const expiraEn = vigencia.vencimientoDesde(new Date());
    await sesiones.abrir({
      huella: tokens.huellaDe(token),
      usuarioId: usuario.id.valor,
      direccionIp: credenciales.direccionIp,
      agenteUsuario: credenciales.agenteUsuario?.slice(0, LARGO_MAXIMO_DEL_AGENTE) ?? null,
      expiraEn,
    });
    await this.dependencias.usuarios.registrarAcceso(usuario.id);
    return { token, expiraEn };
  }

  /** Un nombre mal escrito no existe: se responde igual que a un usuario desconocido. */
  private async buscar(texto: string): Promise<Usuario | null> {
    try {
      return await this.dependencias.usuarios.buscarPorNombre(NombreDeUsuario.crear(texto));
    } catch (error) {
      if (error instanceof NombreDeUsuarioInvalido) return null;
      throw error;
    }
  }
}
