import { configuracion as entorno } from '../../../configuracion.js';
import { bd } from '../base-datos/conexion.js';
import { EnviarPrueba } from './aplicacion/casos-uso/enviar-prueba.js';
import { GuardarServidorDeCorreo } from './aplicacion/casos-uso/guardar-servidor-de-correo.js';
import { ObtenerServidorDeCorreo } from './aplicacion/casos-uso/obtener-servidor-de-correo.js';
import { ServidorDeCorreoControlador } from './http/servidor-de-correo.controlador.js';
import { rutasDelServidorDeCorreo } from './http/servidor-de-correo.rutas.js';
import { CifradorAesGcm } from './infraestructura/cifrador-aes-gcm.js';
import { FabricaDeTransporteNodemailer } from './infraestructura/fabrica-de-transporte-nodemailer.js';
import { ServidorDeCorreoDrizzle } from './infraestructura/persistencia/servidor-de-correo.drizzle.js';

/** Un solo cifrador por proceso: la llave se lee una vez del entorno. */
export const cifradorDeSecretos = new CifradorAesGcm({
  actual: entorno.CLAVE_SECRETOS,
  anterior: entorno.CLAVE_SECRETOS_ANTERIOR,
});

/** Raíz de composición del contexto de correo: el servidor de correo de la instalación (Soporte). */
export function componerCorreo() {
  const repositorio = new ServidorDeCorreoDrizzle(bd);
  const cifrador = cifradorDeSecretos;
  const controlador = new ServidorDeCorreoControlador({
    obtener: new ObtenerServidorDeCorreo({ repositorio, cifrador }),
    guardar: new GuardarServidorDeCorreo({
      repositorio,
      cifrador,
      permitirRedInterna: entorno.CORREO_PERMITIR_RED_INTERNA,
    }),
    enviarPrueba: new EnviarPrueba({ repositorio, cifrador, fabrica: new FabricaDeTransporteNodemailer() }),
  });
  return rutasDelServidorDeCorreo(controlador);
}
