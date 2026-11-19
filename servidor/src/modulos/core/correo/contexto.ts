import type { FastifyPluginAsync } from 'fastify';
import { configuracion as entorno } from '../../../configuracion.js';
import { bd } from '../base-datos/conexion.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { TareasDeLaTransaccionPostgres } from '../compartido/infraestructura/tareas-de-la-transaccion-postgres.js';
import { CancelarCorreo } from './aplicacion/casos-uso/cancelar-correo.js';
import { EnviarPrueba } from './aplicacion/casos-uso/enviar-prueba.js';
import { GuardarServidorDeCorreo } from './aplicacion/casos-uso/guardar-servidor-de-correo.js';
import { ListarCorreos } from './aplicacion/casos-uso/listar-correos.js';
import { ObtenerBandejaDeSoporte } from './aplicacion/casos-uso/obtener-bandeja-de-soporte.js';
import { ObtenerCorreo } from './aplicacion/casos-uso/obtener-correo.js';
import { ObtenerServidorDeCorreo } from './aplicacion/casos-uso/obtener-servidor-de-correo.js';
import { ReintentarCorreo } from './aplicacion/casos-uso/reintentar-correo.js';
import { despertadorDeBandeja, parametrosDeCorreo } from './bandeja.js';
import { CorreosControlador } from './http/correos.controlador.js';
import { rutasDeCorreos } from './http/correos.rutas.js';
import { ServidorDeCorreoControlador } from './http/servidor-de-correo.controlador.js';
import { rutasDelServidorDeCorreo } from './http/servidor-de-correo.rutas.js';
import { cifradorDeSecretos } from './infraestructura/cifrador-del-entorno.js';
import { FabricaDeTransporteNodemailer } from './infraestructura/fabrica-de-transporte-nodemailer.js';
import { EstadoDeLaBandejaDrizzle } from './infraestructura/persistencia/estado-de-la-bandeja.drizzle.js';
import { HistorialDeCorreosDrizzle } from './infraestructura/persistencia/historial-de-correos.drizzle.js';
import { RepositorioDeCorreosDrizzle } from './infraestructura/persistencia/repositorio-de-correos.drizzle.js';
import { ServidorDeCorreoDrizzle } from './infraestructura/persistencia/servidor-de-correo.drizzle.js';

/** Soporte: el servidor de correo de la instalación y el estado de la bandeja de todas las empresas. */
function controladorDeSoporte(): ServidorDeCorreoControlador {
  const repositorio = new ServidorDeCorreoDrizzle(bd);
  const cifrador = cifradorDeSecretos;
  return new ServidorDeCorreoControlador({
    obtener: new ObtenerServidorDeCorreo({ repositorio, cifrador }),
    guardar: new GuardarServidorDeCorreo({
      repositorio,
      cifrador,
      permitirRedInterna: entorno.CORREO_PERMITIR_RED_INTERNA,
    }),
    enviarPrueba: new EnviarPrueba({ repositorio, cifrador, fabrica: new FabricaDeTransporteNodemailer() }),
    bandeja: new ObtenerBandejaDeSoporte(new EstadoDeLaBandejaDrizzle(bd)),
  });
}

/** La empresa: el historial de sus correos, con cancelar y reintentar. */
function controladorDeCorreos(compartidas: DependenciasCompartidas): CorreosControlador {
  const { unidadDeTrabajo, auditoria } = compartidas;
  const historial = new HistorialDeCorreosDrizzle();
  return new CorreosControlador({
    listar: new ListarCorreos({ unidadDeTrabajo, historial }),
    obtener: new ObtenerCorreo({ unidadDeTrabajo, historial }),
    cancelar: new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }),
    reintentar: new ReintentarCorreo({
      unidadDeTrabajo,
      historial,
      auditoria,
      repositorio: new RepositorioDeCorreosDrizzle(),
      parametros: parametrosDeCorreo,
      tareas: new TareasDeLaTransaccionPostgres(),
      despertador: despertadorDeBandeja,
    }),
  });
}

/** Raíz de composición del contexto de correo: Soporte (servidor y bandeja) y el historial de la empresa. */
export function componerCorreo(compartidas: DependenciasCompartidas): FastifyPluginAsync {
  return async (app) => {
    await app.register(rutasDelServidorDeCorreo(controladorDeSoporte()));
    await app.register(rutasDeCorreos(controladorDeCorreos(compartidas)));
  };
}
