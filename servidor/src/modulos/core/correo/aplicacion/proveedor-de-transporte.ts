import { DireccionDeEnvio } from '../dominio/direccion-de-envio.js';
import { ServidorDeCorreoNoConfigurado } from '../dominio/errores-del-servidor-de-correo.js';
import { recifrarSiHaceFalta } from './recifrar-secreto.js';
import { CONTEXTO_DE_LA_CONTRASENA } from './contexto-de-la-contrasena.js';
import type { CifradorDeSecretos } from './puertos/cifrador-de-secretos.js';
import type { FabricaDeTransporte } from './puertos/fabrica-de-transporte.js';
import type { ServidorDeCorreoRepositorio, ServidorGuardado } from './puertos/servidor-de-correo-repositorio.js';
import type { PersonaDeCorreo, TransporteDeCorreo } from './transporte-de-correo.js';

/** El transporte del servidor activo y el remitente fijo de la instalación (C7). */
export interface TransporteListo {
  readonly transporte: TransporteDeCorreo;
  readonly remitente: PersonaDeCorreo;
}

interface Dependencias {
  repositorio: ServidorDeCorreoRepositorio;
  cifrador: CifradorDeSecretos;
  fabrica: FabricaDeTransporte;
}

/** Lo que identifica una conexión: si cambia, hay que armar otro transporte (no cuenta la última prueba). */
function huellaDe(servidor: ServidorGuardado): string {
  const { servidor: nombre, puerto, seguridad, usuario, contrasena } = servidor;
  return [nombre, puerto, seguridad, usuario, contrasena?.iv.toString('hex')].join('|');
}

/**
 * Un solo transporte por proceso, con conexiones agrupadas. Lee el servidor guardado en cada lote y solo arma otro
 * transporte cuando Soporte cambió la conexión o la contraseña (cierra el anterior).
 */
export class ProveedorDeTransporte {
  private actual: { huella: string; listo: TransporteListo } | null = null;

  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws ServidorDeCorreoNoConfigurado si no hay servidor activo con contraseña.
   * @throws LlaveDeSecretosNoDisponible si falta la llave con que se cifró la contraseña.
   */
  async obtener(): Promise<TransporteListo> {
    const guardado = await this.dependencias.repositorio.obtener();
    if (!guardado?.activo || !guardado.contrasena) throw new ServidorDeCorreoNoConfigurado();
    const servidor = { ...guardado, contrasena: await recifrarSiHaceFalta(this.dependencias, guardado.contrasena) };
    const huella = huellaDe(servidor);
    if (this.actual?.huella !== huella) {
      await this.cerrar();
      this.actual = { huella, listo: this.armar(servidor, servidor.contrasena) };
    }
    return this.actual!.listo;
  }

  async cerrar(): Promise<void> {
    const anterior = this.actual;
    this.actual = null;
    await anterior?.listo.transporte.cerrar();
  }

  private armar(servidor: ServidorGuardado, secreto: NonNullable<ServidorGuardado['contrasena']>): TransporteListo {
    const contrasena = this.dependencias.cifrador.descifrar(secreto, CONTEXTO_DE_LA_CONTRASENA);
    const { servidor: nombre, puerto, seguridad, usuario } = servidor;
    return {
      transporte: this.dependencias.fabrica.crear({ servidor: nombre, puerto, seguridad, usuario, contrasena }),
      remitente: { direccion: DireccionDeEnvio.crear(servidor.remitenteDireccion), nombre: servidor.remitenteNombre },
    };
  }
}
