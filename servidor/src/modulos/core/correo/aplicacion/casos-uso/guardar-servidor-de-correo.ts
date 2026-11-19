import type { SecretoCifrado, CifradorDeSecretos } from '../puertos/cifrador-de-secretos.js';
import type { ServidorDeCorreoRepositorio, ServidorGuardado } from '../puertos/servidor-de-correo-repositorio.js';
import { aDtoDelServidor, type ServidorDeCorreoDto } from '../dto/servidor-de-correo.dto.js';
import {
  CambioDeDestinoSinContrasena,
  ServidorDeCorreoInvalido,
} from '../../dominio/errores-del-servidor-de-correo.js';
import {
  validarServidorDeCorreo,
  type DatosDelServidor,
  type EntradaDelServidor,
} from '../../dominio/servidor-de-correo.js';
import { CONTEXTO_DE_LA_CONTRASENA } from '../contexto-de-la-contrasena.js';
import type { Solicitante } from '../solicitante.js';

export interface EntradaDeGuardado extends EntradaDelServidor {
  /** Si falta, se conserva la que ya está guardada. */
  readonly contrasena?: string | undefined;
}

interface Dependencias {
  repositorio: ServidorDeCorreoRepositorio;
  cifrador: CifradorDeSecretos;
  permitirRedInterna: boolean;
}

/** Cambia el destino de la contraseña guardada: obliga a escribirla otra vez (así no se puede desviar a otro host). */
function cambiaElDestino(anterior: ServidorGuardado | null, nuevo: DatosDelServidor): boolean {
  return (
    anterior !== null &&
    (anterior.servidor !== nuevo.servidor || anterior.puerto !== nuevo.puerto || anterior.usuario !== nuevo.usuario)
  );
}

/** Soporte guarda el servidor de correo de la instalación (solo superacceso). La contraseña solo se escribe. */
export class GuardarServidorDeCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws ServidorDeCorreoInvalido si un dato no cumple, o se activa sin contraseña, o se cambió el servidor, el
   * puerto o el usuario sin escribir otra vez la contraseña.
   * @throws LlaveDeSecretosNoDisponible si se escribe una contraseña y falta `CLAVE_SECRETOS`.
   */
  async ejecutar(solicitante: Solicitante, entrada: EntradaDeGuardado): Promise<ServidorDeCorreoDto> {
    const { repositorio, cifrador, permitirRedInterna } = this.dependencias;
    const datos = validarServidorDeCorreo(entrada, { permitirRedInterna });
    const anterior = await repositorio.obtener();
    const contrasena = this.cifrarSiLlega(entrada.contrasena);
    this.exigirCoherencia({ anterior, datos, contrasena });
    await repositorio.guardar(
      { datos, ...(contrasena ? { contrasena } : {}) },
      {
        ...solicitante,
        accion: 'correo.servidor.guardar',
        detalle: { ...datos, contrasenaCambiada: contrasena !== undefined },
      },
    );
    return aDtoDelServidor(await repositorio.obtener(), cifrador.disponible);
  }

  private cifrarSiLlega(contrasena: string | undefined): SecretoCifrado | undefined {
    if (contrasena === undefined || contrasena === '') return undefined;
    return this.dependencias.cifrador.cifrar(contrasena, CONTEXTO_DE_LA_CONTRASENA);
  }

  private exigirCoherencia(estado: {
    anterior: ServidorGuardado | null;
    datos: DatosDelServidor;
    contrasena: SecretoCifrado | undefined;
  }): void {
    const { anterior, datos, contrasena } = estado;
    const hayContrasena = Boolean(contrasena ?? anterior?.contrasena);
    if (datos.activo && !hayContrasena) {
      throw new ServidorDeCorreoInvalido('Escriba la contraseña antes de activar el servidor de correo.');
    }
    if (hayContrasena && !contrasena && cambiaElDestino(anterior, datos)) throw new CambioDeDestinoSinContrasena();
  }
}
