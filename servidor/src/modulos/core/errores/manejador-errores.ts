import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';
import { DatabaseError } from 'pg';
import { ErrorAplicacion } from './errores.js';

interface CuerpoError {
  error: { codigo: string; mensaje: string; detalles?: unknown };
}

const MENSAJES_RESTRICCION: Record<string, string> = {
  usuarios_usuario_unico: 'Ese nombre de usuario ya está en uso.',
  roles_nombre_por_cuenta: 'Ya existe un rol con ese nombre.',
};

/** Busca en la cadena de causas un error de PostgreSQL (Drizzle lo envuelve). */
function extraerErrorPostgres(error: unknown): DatabaseError | null {
  let actual: unknown = error;
  for (let profundidad = 0; actual && profundidad < 5; profundidad++) {
    if (actual instanceof DatabaseError) return actual;
    actual = (actual as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Traduce cualquier error a una respuesta JSON uniforme `{ error: { codigo, mensaje } }`.
 * Los errores no previstos se registran y se ocultan al cliente.
 */
export function manejarError(error: FastifyError, solicitud: FastifyRequest, respuesta: FastifyReply) {
  const responder = (codigoHttp: number, cuerpo: CuerpoError) => respuesta.status(codigoHttp).send(cuerpo);

  if (error instanceof ErrorAplicacion) {
    return responder(error.codigoHttp, {
      error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles },
    });
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const campos = error.validation.map((v) => ({
      campo: v.instancePath.replace(/^\//, '').replaceAll('/', '.'),
      mensaje: v.message,
    }));
    return responder(400, {
      error: { codigo: 'validacion', mensaje: 'Revise los datos enviados.', detalles: campos },
    });
  }

  if (isResponseSerializationError(error)) {
    solicitud.log.error({ err: error, problemas: error.cause.issues }, 'Respuesta fuera de esquema');
    return responder(500, { error: { codigo: 'error_interno', mensaje: 'Ocurrió un error inesperado.' } });
  }

  const errorPostgres = extraerErrorPostgres(error);
  if (errorPostgres?.code === '23505') {
    const mensaje = MENSAJES_RESTRICCION[errorPostgres.constraint ?? ''] ?? 'El registro ya existe.';
    return responder(409, { error: { codigo: 'duplicado', mensaje } });
  }
  if (errorPostgres?.code === '23503') {
    return responder(409, {
      error: { codigo: 'en_uso', mensaje: 'El registro está relacionado con otros datos y no se puede eliminar.' },
    });
  }

  if (error.statusCode && error.statusCode < 500) {
    return responder(error.statusCode, {
      error: { codigo: error.code ?? 'solicitud_invalida', mensaje: error.message },
    });
  }

  solicitud.log.error({ err: error }, 'Error no controlado');
  return responder(500, { error: { codigo: 'error_interno', mensaje: 'Ocurrió un error inesperado.' } });
}
