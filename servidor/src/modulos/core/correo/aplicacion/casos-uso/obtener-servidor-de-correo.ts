import type { CifradorDeSecretos } from '../puertos/cifrador-de-secretos.js';
import type { ServidorDeCorreoRepositorio } from '../puertos/servidor-de-correo-repositorio.js';
import { aDtoDelServidor, type ServidorDeCorreoDto } from '../dto/servidor-de-correo.dto.js';

interface Dependencias {
  repositorio: ServidorDeCorreoRepositorio;
  cifrador: CifradorDeSecretos;
}

/** El servidor de correo para el panel de Soporte, sin la contraseña. */
export class ObtenerServidorDeCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<ServidorDeCorreoDto> {
    const { repositorio, cifrador } = this.dependencias;
    return aDtoDelServidor(await repositorio.obtener(), cifrador.disponible);
  }
}
