import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';
import { ErrorAplicacion } from '../../errores/errores.js';
import { ErrorEsperado } from '../dominio/errores.js';
import { estadoHttpDe } from './estado-http-de-error.js';

interface ErrorEnRespuesta {
  codigo: string;
  mensaje: string;
  detalles?: unknown;
}

interface RespuestaDeError {
  estado: number;
  cuerpo: { error: ErrorEnRespuesta };
}

/** Reconoce errores de afuera (por ejemplo, de la base de datos) que en realidad son esperados. */
export type InterpretadorDeErrorExterno = (error: unknown) => ErrorEsperado | null;

type Traductor = (error: FastifyError) => RespuestaDeError | null;

const ERROR_INTERNO: RespuestaDeError = {
  estado: 500,
  cuerpo: { error: { codigo: 'error_interno', mensaje: 'Ocurrió un error inesperado.' } },
};

function responderCon(estado: number, error: ErrorEnRespuesta): RespuestaDeError {
  return { estado, cuerpo: { error } };
}

function traducirErrorEsperado(error: ErrorEsperado): RespuestaDeError {
  return responderCon(estadoHttpDe(error), { codigo: error.codigo, mensaje: error.message, detalles: error.detalles });
}

/** Errores del código anterior a la arquitectura por capas; se retira en la fase 7. */
const traducirErrorDeAplicacionAnterior: Traductor = (error) =>
  error instanceof ErrorAplicacion
    ? responderCon(error.codigoHttp, { codigo: error.codigo, mensaje: error.message, detalles: error.detalles })
    : null;

const traducirValidacionDeEntrada: Traductor = (error) => {
  if (!hasZodFastifySchemaValidationErrors(error)) return null;
  const campos = error.validation.map((problema) => ({
    campo: problema.instancePath.replace(/^\//, '').replaceAll('/', '.'),
    mensaje: problema.message,
  }));
  return responderCon(400, { codigo: 'validacion', mensaje: 'Revise los datos enviados.', detalles: campos });
};

/** Errores del propio Fastify con estado 4xx (por ejemplo, un cuerpo JSON mal formado). */
const traducirErrorDeFastify: Traductor = (error) =>
  error.statusCode && error.statusCode < 500
    ? responderCon(error.statusCode, { codigo: error.code ?? 'solicitud_invalida', mensaje: error.message })
    : null;

/**
 * Arma el manejador de errores de la API: convierte cualquier error en una
 * respuesta JSON `{ error: { codigo, mensaje, detalles } }`. Los no previstos se
 * registran y al cliente solo le llega un mensaje genérico.
 *
 * @param interpretarErrorExterno lo aporta la infraestructura (por ejemplo, las
 * restricciones de PostgreSQL), para que esta capa no conozca la base de datos.
 */
export function crearManejadorDeErrores(interpretarErrorExterno: InterpretadorDeErrorExterno) {
  const traducirErrorEsperadoOExterno: Traductor = (error) => {
    const esperado = error instanceof ErrorEsperado ? error : interpretarErrorExterno(error);
    return esperado ? traducirErrorEsperado(esperado) : null;
  };
  const traductores = [
    traducirErrorEsperadoOExterno,
    traducirErrorDeAplicacionAnterior,
    traducirValidacionDeEntrada,
    traducirErrorDeFastify,
  ];

  function traducir(error: FastifyError, solicitud: FastifyRequest): RespuestaDeError {
    if (isResponseSerializationError(error)) {
      solicitud.log.error({ err: error, problemas: error.cause.issues }, 'Respuesta fuera de esquema');
      return ERROR_INTERNO;
    }
    const traducida = traductores.map((traductor) => traductor(error)).find((respuesta) => respuesta !== null);
    if (!traducida) solicitud.log.error({ err: error }, 'Error no controlado');
    return traducida ?? ERROR_INTERNO;
  }

  return (error: FastifyError, solicitud: FastifyRequest, respuesta: FastifyReply) => {
    const { estado, cuerpo } = traducir(error, solicitud);
    return respuesta.status(estado).send(cuerpo);
  };
}
