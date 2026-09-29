import {
  AccesoDenegado,
  NoAutenticado,
  RecursoDuplicado,
  RecursoEnUso,
  RecursoNoEncontrado,
} from '../aplicacion/errores.js';
import {
  CargaDemasiadoGrande,
  DatoInvalido,
  DemasiadasSolicitudes,
  ReglaDeNegocioInfringida,
  type ErrorEsperado,
} from '../dominio/errores.js';

type FamiliaDeError = abstract new (...argumentos: never[]) => ErrorEsperado;

const ESTADO_POR_FAMILIA: ReadonlyArray<readonly [FamiliaDeError, number]> = [
  [DatoInvalido, 400],
  [NoAutenticado, 401],
  [AccesoDenegado, 403],
  [RecursoNoEncontrado, 404],
  [RecursoDuplicado, 409],
  [RecursoEnUso, 409],
  [ReglaDeNegocioInfringida, 422],
  [CargaDemasiadoGrande, 413],
  [DemasiadasSolicitudes, 429],
];

const ESTADO_SI_NO_HAY_FAMILIA = 400;

/** Código HTTP con el que se responde a un error esperado, según su familia. */
export function estadoHttpDe(error: ErrorEsperado): number {
  const familia = ESTADO_POR_FAMILIA.find(([Familia]) => error instanceof Familia);
  return familia?.[1] ?? ESTADO_SI_NO_HAY_FAMILIA;
}
