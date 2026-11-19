import { randomUUID } from 'node:crypto';
import { DireccionDeEnvio } from '../../dominio/direccion-de-envio.js';
import { armarCuerpos } from '../../dominio/diseno-de-correo.js';
import { ServidorDeCorreoNoConfigurado } from '../../dominio/errores-del-servidor-de-correo.js';
import { recifrarSiHaceFalta } from '../recifrar-secreto.js';
import { CONTEXTO_DE_LA_CONTRASENA } from '../contexto-de-la-contrasena.js';
import type { ResultadoDePruebaDto } from '../dto/servidor-de-correo.dto.js';
import type { CifradorDeSecretos, SecretoCifrado } from '../puertos/cifrador-de-secretos.js';
import type { ConexionAlServidor, FabricaDeTransporte } from '../puertos/fabrica-de-transporte.js';
import type { ServidorDeCorreoRepositorio, ServidorGuardado } from '../puertos/servidor-de-correo-repositorio.js';
import type { Solicitante } from '../solicitante.js';
import type { MensajeDeSalida } from '../transporte-de-correo.js';

interface Dependencias {
  repositorio: ServidorDeCorreoRepositorio;
  cifrador: CifradorDeSecretos;
  fabrica: FabricaDeTransporte;
}

const MENSAJE_DE_PRUEBA =
  'Este es un correo de prueba del servidor de correo de la instalación.\n\nSi lo recibió, el servidor está bien configurado.';

function mensajeDePrueba(servidor: ServidorGuardado, destino: DireccionDeEnvio): MensajeDeSalida {
  const direccion = DireccionDeEnvio.crear(servidor.remitenteDireccion);
  const cuerpos = armarCuerpos({
    mensaje: MENSAJE_DE_PRUEBA,
    empresa: 'el equipo de soporte',
    aplicacion: servidor.remitenteNombre,
    conRespuesta: false,
  });
  return {
    desde: { direccion, nombre: servidor.remitenteNombre },
    responderA: null,
    para: [{ direccion: destino, nombre: null }],
    copia: [],
    asunto: 'Prueba del servidor de correo',
    ...cuerpos,
    messageId: `<${randomUUID()}@${direccion.dominio}>`,
    adjuntos: [],
  };
}

/**
 * Soporte manda un correo de prueba a una dirección que escribe en el momento (el único lugar donde se acepta una
 * dirección libre). Funciona aunque el servidor esté apagado, para probarlo antes de activarlo. El detalle del
 * servidor SMTP nunca sale: solo el resultado y un código.
 */
export class EnviarPrueba {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws DireccionNoUtilizable si el destino no sirve para enviar.
   * @throws ServidorDeCorreoNoConfigurado si no hay servidor guardado o le falta la contraseña.
   * @throws LlaveDeSecretosNoDisponible si falta la llave con que se cifró la contraseña.
   */
  async ejecutar(solicitante: Solicitante, destino: string): Promise<ResultadoDePruebaDto> {
    const { repositorio, fabrica } = this.dependencias;
    const direccion = DireccionDeEnvio.crear(destino.trim());
    const servidor = await repositorio.obtener();
    if (!servidor?.contrasena) throw new ServidorDeCorreoNoConfigurado();
    const secreto = await recifrarSiHaceFalta(this.dependencias, servidor.contrasena);
    const transporte = fabrica.crear(this.conexionA(servidor, secreto));
    try {
      const respuesta = await transporte.enviar(mensajeDePrueba(servidor, direccion));
      await repositorio.registrarPrueba(respuesta.resultado, {
        ...solicitante,
        accion: 'correo.servidor.probar',
        detalle: {
          servidor: servidor.servidor,
          destinoDominio: direccion.dominio,
          resultado: respuesta.resultado,
          codigo: respuesta.codigo,
        },
      });
      return { resultado: respuesta.resultado, codigo: respuesta.codigo };
    } finally {
      await transporte.cerrar();
    }
  }

  private conexionA(servidor: ServidorGuardado, secreto: SecretoCifrado): ConexionAlServidor {
    const { servidor: nombre, puerto, seguridad, usuario } = servidor;
    const contrasena = this.dependencias.cifrador.descifrar(secreto, CONTEXTO_DE_LA_CONTRASENA);
    return { servidor: nombre, puerto, seguridad, usuario, contrasena };
  }
}
