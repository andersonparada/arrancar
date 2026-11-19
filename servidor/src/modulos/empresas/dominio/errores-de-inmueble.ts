import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/** Un dato del inmueble no cumple sus reglas. */
export class InmuebleInvalido extends DatoInvalido {
  readonly codigo: string = 'inmueble_invalido';
}

/** Un inmueble inscrito sin todos los datos de su libro, o uno posesorio con datos de inscripción o sin su documento. */
export class InmuebleRegistroIncompleto extends InmuebleInvalido {
  override readonly codigo = 'inmueble_registro_incompleto';
}

/** El departamento o el municipio elegido no existe en el catálogo oficial. */
export class UbicacionGeograficaInexistente extends DatoInvalido {
  readonly codigo = 'ubicacion_geografica_inexistente';

  constructor(lugar: string) {
    super(`${lugar} no existe: revise el código.`);
  }
}
