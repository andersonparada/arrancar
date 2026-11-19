import { RecursoEnUso } from '../../core/compartido/aplicacion/errores.js';

/** Parcelas o Activos fijos usan el inmueble: no se elimina, se inactiva. */
export class InmuebleEnUso extends RecursoEnUso {
  override readonly codigo = 'inmueble_en_uso';

  constructor() {
    super('El inmueble está en uso en Parcelas o Activos fijos y no se puede eliminar: inactívelo en su lugar.');
  }
}
