import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/** Un dato del inmueble no cumple sus reglas. */
export class InmuebleInvalido extends DatoInvalido {
  readonly codigo: string = 'inmueble_invalido';
}

/** Un inmueble inscrito sin todos los datos de su libro, o uno posesorio con datos de inscripción o sin su documento. */
export class InmuebleRegistroIncompleto extends InmuebleInvalido {
  override readonly codigo = 'inmueble_registro_incompleto';
}
