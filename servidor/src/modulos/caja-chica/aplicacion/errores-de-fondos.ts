import { RecursoDuplicado } from '../../core/compartido/aplicacion/errores.js';

/** Ya hay otro fondo con ese nombre en la empresa (sin distinguir mayúsculas ni tildes). */
export class NombreDeFondoRepetido extends RecursoDuplicado {
  override readonly codigo = 'nombre_de_fondo_repetido';

  constructor() {
    super('Ya existe un fondo con ese nombre.', { campo: 'nombre' });
  }
}
