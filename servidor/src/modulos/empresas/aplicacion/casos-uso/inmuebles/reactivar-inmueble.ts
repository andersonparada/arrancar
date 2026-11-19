import { CambiarEstadoDeInmueble } from './cambiar-estado-de-inmueble.js';

export class ReactivarInmueble extends CambiarEstadoDeInmueble {
  protected readonly activoDespues = true;
}
