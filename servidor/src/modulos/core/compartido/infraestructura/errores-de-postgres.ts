import { DatabaseError } from 'pg';
import { RecursoDuplicado, RecursoEnUso } from '../aplicacion/errores.js';
import type { ErrorEsperado } from '../dominio/errores.js';

const VIOLACION_DE_UNICIDAD = '23505';
const VIOLACION_DE_LLAVE_FORANEA = '23503';
const PROFUNDIDAD_MAXIMA_DE_CAUSAS = 5;

const MENSAJES_POR_RESTRICCION: Readonly<Record<string, string>> = {
  usuarios_usuario_unico: 'Ese nombre de usuario ya está en uso.',
  roles_nombre_por_cuenta: 'Ya existe un rol con ese nombre.',
  cuentas_bancarias_numero_por_banco_unico: 'Ya existe una cuenta con ese número en ese banco.',
};

/** La base de datos rechazó un valor repetido en una columna única. */
class ValorUnicoRepetido extends RecursoDuplicado {
  override readonly codigo = 'duplicado';
}

/** Drizzle envuelve los errores de PostgreSQL; se buscan en la cadena de causas. */
function buscarErrorDePostgres(error: unknown): DatabaseError | null {
  let actual = error;
  for (let nivel = 0; actual && nivel < PROFUNDIDAD_MAXIMA_DE_CAUSAS; nivel++) {
    if (actual instanceof DatabaseError) return actual;
    actual = (actual as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Convierte en error esperado lo que la base de datos rechaza por sus
 * restricciones (valores únicos y llaves foráneas); cualquier otro error sigue
 * siendo un fallo inesperado.
 */
export function interpretarErrorDePostgres(error: unknown): ErrorEsperado | null {
  const errorDePostgres = buscarErrorDePostgres(error);
  if (errorDePostgres?.code === VIOLACION_DE_UNICIDAD) {
    const mensaje = MENSAJES_POR_RESTRICCION[errorDePostgres.constraint ?? ''] ?? 'El registro ya existe.';
    return new ValorUnicoRepetido(mensaje);
  }
  if (errorDePostgres?.code === VIOLACION_DE_LLAVE_FORANEA) return new RecursoEnUso();
  return null;
}
