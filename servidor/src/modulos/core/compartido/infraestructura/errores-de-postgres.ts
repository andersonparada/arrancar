import { DatabaseError } from 'pg';
import { RecursoDuplicado, RecursoEnUso, RecursoNoEncontrado } from '../aplicacion/errores.js';
import type { ErrorEsperado } from '../dominio/errores.js';

const VIOLACION_DE_UNICIDAD = '23505';
const VIOLACION_DE_LLAVE_FORANEA = '23503';
const VIOLACION_DE_POLITICA_RLS = '42501';
const PROFUNDIDAD_MAXIMA_DE_CAUSAS = 5;

const PEDIR_ACCESO_A_LOCALIDADES = 'Si no la ve, pida acceso a quien administra las localidades.';

const MENSAJES_POR_RESTRICCION: Readonly<Record<string, string>> = {
  usuarios_usuario_unico: 'Ese nombre de usuario ya está en uso.',
  roles_nombre_por_cuenta: 'Ya existe un rol con ese nombre.',
  cuentas_bancarias_numero_por_banco_unico: 'Ya existe una cuenta con ese número en ese banco.',
  conceptos_nombre_unico: 'Ya existe un concepto con ese nombre.',
  tipos_de_localidad_nombre_unico: 'Ya existe un tipo de localidad con ese nombre.',
  localidades_codigo_unico: `Ya existe una localidad con ese código. ${PEDIR_ACCESO_A_LOCALIDADES}`,
  localidades_nombre_unico: `Ya existe una localidad con ese nombre. ${PEDIR_ACCESO_A_LOCALIDADES}`,
  localidades_establecimiento_sat_unico: `Ya existe una localidad con ese código de establecimiento SAT. ${PEDIR_ACCESO_A_LOCALIDADES}`,
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
 * restricciones (valores únicos y llaves foráneas) o por las políticas RLS
 * (fila fuera del alcance: se responde como no encontrada, sin revelar nada); cualquier otro error sigue
 * siendo un fallo inesperado.
 */
export function interpretarErrorDePostgres(error: unknown): ErrorEsperado | null {
  const errorDePostgres = buscarErrorDePostgres(error);
  if (!errorDePostgres) return null;
  if (errorDePostgres.code === VIOLACION_DE_UNICIDAD) {
    const mensaje = MENSAJES_POR_RESTRICCION[errorDePostgres.constraint ?? ''] ?? 'El registro ya existe.';
    return new ValorUnicoRepetido(mensaje);
  }
  if (errorDePostgres.code === VIOLACION_DE_LLAVE_FORANEA) return new RecursoEnUso();
  if (errorDePostgres.code === VIOLACION_DE_POLITICA_RLS) return new RecursoNoEncontrado('El registro');
  return null;
}
