import { RecursoDuplicado } from '../../compartido/aplicacion/errores.js';
import { SinNombreDeUsuarioLibre } from '../dominio/errores.js';
import { candidatosDeNombreDeUsuario, NombreDeUsuario } from '../dominio/nombre-de-usuario.js';
import type { NombresDePersona } from './dto/usuario.dto.js';
import type { RepositorioUsuarios } from './puertos/repositorio-usuarios.js';

/** Decide con qué nombre de usuario entrará una persona nueva. */
export class AsignadorDeNombreDeUsuario {
  constructor(private readonly dependencias: { usuarios: RepositorioUsuarios }) {}

  /** El primer candidato libre (ver `candidatosDeNombreDeUsuario`), o `null` si todos están ocupados. */
  async sugerir(nombres: string, apellidos: string): Promise<NombreDeUsuario | null> {
    const candidatos = candidatosDeNombreDeUsuario(nombres, apellidos);
    const ocupados = await this.dependencias.usuarios.nombresOcupados(candidatos);
    const libre = candidatos.find((candidato) => !ocupados.has(candidato));
    return libre ? NombreDeUsuario.crear(libre) : null;
  }

  /**
   * El escrito a mano si está libre o, si no se escribió, el primero libre.
   * @throws RecursoDuplicado si el escrito a mano ya existe.
   * @throws SinNombreDeUsuarioLibre si no se pudo generar uno libre.
   */
  async paraNuevo({ usuario, nombres, apellidos }: NombresDePersona): Promise<NombreDeUsuario> {
    if (usuario) return this.exigirLibre(NombreDeUsuario.crear(usuario));
    const sugerido = await this.sugerir(nombres, apellidos);
    if (!sugerido) throw new SinNombreDeUsuarioLibre();
    return sugerido;
  }

  private async exigirLibre(nombre: NombreDeUsuario): Promise<NombreDeUsuario> {
    if (await this.dependencias.usuarios.buscarPorNombre(nombre)) {
      throw new RecursoDuplicado(`El usuario "${nombre.valor}" ya está en uso. Elija otro.`);
    }
    return nombre;
  }
}
