import { DatabaseError } from 'pg';
import { describe, expect, it } from 'vitest';
import { RecursoDuplicado, RecursoEnUso, RecursoNoEncontrado } from '../aplicacion/errores.js';
import { interpretarErrorDePostgres } from './errores-de-postgres.js';

function errorDePostgres(codigo: string, restriccion?: string): DatabaseError {
  const error = new DatabaseError('rechazado por la base de datos', 0, 'error');
  error.code = codigo;
  error.constraint = restriccion;
  return error;
}

/** Así llega en realidad: Drizzle envuelve el error original en su propia excepción. */
function envueltoPorDrizzle(causa: Error): Error {
  return new Error('Failed query', { cause: causa });
}

describe('errores de PostgreSQL que en realidad son esperados', () => {
  it('un valor único repetido es un recurso duplicado, con mensaje propio si se conoce la restricción', () => {
    const error = interpretarErrorDePostgres(envueltoPorDrizzle(errorDePostgres('23505', 'usuarios_usuario_unico')));

    expect(error).toBeInstanceOf(RecursoDuplicado);
    expect(error).toMatchObject({ codigo: 'duplicado', message: 'Ese nombre de usuario ya está en uso.' });
  });

  it('borrar algo que otros datos usan es un recurso en uso', () => {
    expect(interpretarErrorDePostgres(errorDePostgres('23503'))).toBeInstanceOf(RecursoEnUso);
  });

  it('una fila fuera del alcance (política RLS) se responde como no encontrada', () => {
    expect(interpretarErrorDePostgres(errorDePostgres('42501'))).toBeInstanceOf(RecursoNoEncontrado);
  });

  it('cualquier otro error no se interpreta', () => {
    expect(interpretarErrorDePostgres(errorDePostgres('42P01'))).toBeNull();
    expect(interpretarErrorDePostgres(new Error('otro fallo'))).toBeNull();
  });
});
