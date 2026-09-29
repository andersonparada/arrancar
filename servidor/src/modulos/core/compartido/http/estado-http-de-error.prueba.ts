import { describe, expect, it } from 'vitest';
import { AccesoDenegado, RecursoDuplicado, RecursoEnUso, RecursoNoEncontrado } from '../aplicacion/errores.js';
import { NitInvalido } from '../dominio/objetos-valor/nit.js';
import { CargaDemasiadoGrande, DemasiadasSolicitudes, ReglaDeNegocioInfringida } from '../dominio/errores.js';
import { estadoHttpDe } from './estado-http-de-error.js';

class ArchivoGigante extends CargaDemasiadoGrande {
  readonly codigo = 'archivo_gigante';
}

class MuchasPeticiones extends DemasiadasSolicitudes {
  readonly codigo = 'muchas_peticiones';
}

class TerceroInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'tercero_inactivo';
}

describe('estado HTTP de cada familia de errores', () => {
  it.each([
    ['un dato inválido', new NitInvalido('123'), 400],
    ['un acceso denegado', new AccesoDenegado(), 403],
    ['un recurso que no existe', new RecursoNoEncontrado('El tercero'), 404],
    ['un recurso duplicado', new RecursoDuplicado('Ya existe un tercero con ese NIT.'), 409],
    ['un recurso en uso', new RecursoEnUso(), 409],
    ['una regla de negocio infringida', new TerceroInactivo('El tercero está inactivo.'), 422],
    ['una carga demasiado grande', new ArchivoGigante('Muy grande.'), 413],
    ['demasiadas solicitudes', new MuchasPeticiones('Muchas.'), 429],
  ])('responde a %s con %i', (_descripcion, error, estado) => {
    expect(estadoHttpDe(error)).toBe(estado);
  });
});
